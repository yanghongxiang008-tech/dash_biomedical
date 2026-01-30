-- Add new fields to profiles table
ALTER TABLE profiles ADD COLUMN display_name text;
ALTER TABLE profiles ADD COLUMN identity text;
ALTER TABLE profiles ADD COLUMN notion_api_key text;
ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;

-- Update handle_new_user function to include display_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, onboarding_completed)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'display_name', false);
  RETURN NEW;
END;
$$;