-- Ensure profiles table sends complete data in realtime updates
ALTER TABLE public.profiles REPLICA IDENTITY FULL;