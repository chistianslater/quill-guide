-- Create storage bucket for task images
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-images', 'task-images', true);

-- Storage policies for task images
CREATE POLICY "Users can upload their own task images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'task-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own task images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'task-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own task images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'task-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create task_packages table
CREATE TABLE public.task_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_packages
ALTER TABLE public.task_packages ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_packages
CREATE POLICY "Users can view their own task packages"
ON public.task_packages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task packages"
ON public.task_packages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task packages"
ON public.task_packages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task packages"
ON public.task_packages
FOR DELETE
USING (auth.uid() = user_id);

-- Create task_items table
CREATE TABLE public.task_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.task_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original_image_url TEXT NOT NULL,
  simplified_content TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_items
ALTER TABLE public.task_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_items
CREATE POLICY "Users can view their own task items"
ON public.task_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task items"
ON public.task_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task items"
ON public.task_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task items"
ON public.task_items
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for task_packages updated_at
CREATE TRIGGER update_task_packages_updated_at
BEFORE UPDATE ON public.task_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for task_items updated_at
CREATE TRIGGER update_task_items_updated_at
BEFORE UPDATE ON public.task_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();