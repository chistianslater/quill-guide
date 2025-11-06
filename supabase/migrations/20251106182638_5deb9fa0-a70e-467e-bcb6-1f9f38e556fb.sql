-- Add structured_task column to task_items table
ALTER TABLE public.task_items 
ADD COLUMN structured_task jsonb DEFAULT NULL;