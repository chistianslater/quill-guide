-- Add TTS setting to profiles table
ALTER TABLE public.profiles
ADD COLUMN tts_enabled BOOLEAN DEFAULT false;