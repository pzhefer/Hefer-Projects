/*
  # Fix Administrator Case Sensitivity

  1. Changes
    - Update user_is_administrator function to be case-insensitive
    - This fixes the issue where the function checks for 'administrator' but the role is 'Administrator'

  2. Security
    - Maintains same security checks, just case-insensitive
*/

-- Drop and recreate the function with case-insensitive check
CREATE OR REPLACE FUNCTION user_is_administrator(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_is_administrator.user_id
    AND LOWER(r.name) = 'administrator'
  ) INTO is_admin;

  RETURN is_admin;
END;
$$;
