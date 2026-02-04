-- Set user as Admin
DO $$
DECLARE
  target_email TEXT := 'yanghongxiang008@gmail.com';
  target_user_id UUID;
BEGIN
  -- 1. Get User ID from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found! Please register/sign up first.', target_email;
  ELSE
    -- 2. Ensure only Admin role exists
    -- Remove existing roles first to cleanly set to admin
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    
    -- Insert Admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin');

    RAISE NOTICE 'User % has been successfully promoted to ADMIN.', target_email;
  END IF;
END $$;
