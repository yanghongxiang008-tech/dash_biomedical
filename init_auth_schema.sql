-- 1. Create Enum Types
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  identity TEXT,
  notion_api_key TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Profiles: Users can read/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Roles: Users can read their own role
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- 5. Create Trigger Function for New User Registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.app_role;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, display_name, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'display_name',
    false
  );

  -- Determine role from metadata (set by client after invite code check) or default to 'user'
  -- Cast jsonb value to text, then to enum
  BEGIN
    assigned_role := (NEW.raw_user_meta_data->>'role')::public.app_role;
  EXCEPTION WHEN OTHERS THEN
    assigned_role := 'user';
  END;
  
  IF assigned_role IS NULL THEN
    assigned_role := 'user';
  END IF;

  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Helper Function for Role Checking (used by RLS elsewhere)
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
