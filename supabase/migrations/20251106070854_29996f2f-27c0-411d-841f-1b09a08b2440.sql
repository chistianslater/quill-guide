-- Add buddy_personality column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS buddy_personality TEXT DEFAULT 'encouraging' CHECK (buddy_personality IN ('encouraging', 'funny', 'professional', 'friendly'));

-- Add comment
COMMENT ON COLUMN public.profiles.buddy_personality IS 'The personality type of the learning buddy: encouraging, funny, professional, or friendly';