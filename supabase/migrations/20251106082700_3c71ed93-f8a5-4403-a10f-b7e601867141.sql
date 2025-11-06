-- Add avatar customization columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_customization jsonb DEFAULT '{
  "baseAvatar": "encouraging",
  "skinTone": "medium",
  "hairStyle": "short",
  "hairColor": "brown",
  "eyeColor": "brown",
  "accessories": []
}'::jsonb;