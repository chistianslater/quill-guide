-- Create subject_assessments table
CREATE TABLE public.subject_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  actual_grade_level INTEGER NOT NULL,
  estimated_level INTEGER NOT NULL,
  discrepancy INTEGER GENERATED ALWAYS AS (actual_grade_level - estimated_level) STORED,
  confidence DECIMAL(3,2) DEFAULT 0.5,
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  questions_asked JSONB,
  answers_given JSONB,
  is_priority BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_subject_assessments_user_id ON public.subject_assessments(user_id);
CREATE INDEX idx_subject_assessments_priority ON public.subject_assessments(user_id, is_priority);

-- Enable RLS
ALTER TABLE public.subject_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own assessments"
  ON public.subject_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
  ON public.subject_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON public.subject_assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- Extend competency_progress table
ALTER TABLE public.competency_progress
ADD COLUMN IF NOT EXISTS estimated_level INTEGER,
ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE;

-- Create index for priority queries
CREATE INDEX IF NOT EXISTS idx_competency_progress_priority ON public.competency_progress(user_id, is_priority);

-- Add trigger for updated_at
CREATE TRIGGER update_subject_assessments_updated_at
  BEFORE UPDATE ON public.subject_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();