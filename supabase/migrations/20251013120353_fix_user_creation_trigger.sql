/*
  # Fix User Creation Trigger

  1. Changes
    - Recreate the handle_new_user function to properly bypass RLS
    - Ensure the function can insert into user_profiles and user_roles
    - Set proper security context for the trigger function

  2. Notes
    - The SECURITY DEFINER ensures the function runs with the privileges of the function owner
    - This allows the trigger to insert into user_roles even though the new user isn't an admin yet
*/

-- Drop and recreate the trigger function with proper security settings
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_role_id uuid;
  user_count integer;
BEGIN
  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Count existing users (excluding the one we just created)
  SELECT COUNT(*) INTO user_count FROM user_profiles WHERE id != NEW.id;

  -- Assign role based on whether this is the first user
  IF user_count = 0 THEN
    -- First user gets administrator role
    SELECT id INTO default_role_id FROM roles WHERE name = 'administrator' LIMIT 1;
  ELSE
    -- Subsequent users get viewer role
    SELECT id INTO default_role_id FROM roles WHERE name = 'viewer' LIMIT 1;
  END IF;

  -- Insert the role assignment if a role was found
  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
