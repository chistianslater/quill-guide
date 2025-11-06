-- Enable realtime for profiles table to see avatar changes immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;