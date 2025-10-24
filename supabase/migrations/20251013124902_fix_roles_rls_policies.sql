/*
  # Fix Roles RLS Policies for Case Sensitivity

  1. Changes
    - Update is_user_admin function to be case-insensitive
    - Update all roles table policies to be case-insensitive
    - Ensure administrators can properly manage roles regardless of case

  2. Security
    - Only administrators can insert, update, or delete roles
    - All authenticated users can view roles
*/

-- Update the is_user_admin function to be case-insensitive
CREATE OR REPLACE FUNCTION is_user_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_id
    AND LOWER(r.name) = 'administrator'
  );
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "All users can view roles" ON roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON roles;

-- Recreate policies with case-insensitive checks
CREATE POLICY "All users can view roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert roles"
  ON roles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Only admins can update roles"
  ON roles
  FOR UPDATE
  TO authenticated
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
  ON roles
  FOR DELETE
  TO authenticated
  USING (is_user_admin(auth.uid()));
