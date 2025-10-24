/*
  # Make First User Administrator

  1. Changes
    - Updates handle_new_user function to check if this is the first user
    - If it's the first user (no existing users), assigns administrator role
    - Otherwise assigns viewer role as default

  2. Notes
    - First user will have full system access
    - Subsequent users will be viewers until administrator assigns roles
*/

-- Update handle_new_user function to make first user an administrator
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_role_id uuid;
  user_count integer;
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  SELECT COUNT(*) INTO user_count FROM user_profiles WHERE id != NEW.id;
  
  IF user_count = 0 THEN
    SELECT id INTO default_role_id FROM roles WHERE name = 'administrator' LIMIT 1;
  ELSE
    SELECT id INTO default_role_id FROM roles WHERE name = 'viewer' LIMIT 1;
  END IF;
  
  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;