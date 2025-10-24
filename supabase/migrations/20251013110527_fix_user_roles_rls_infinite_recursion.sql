/*
  # Fix User Roles RLS Infinite Recursion

  1. Problem
    - Current RLS policies on user_roles table check the same table they're protecting
    - This creates infinite recursion when checking if user is administrator
    
  2. Solution
    - Create a security definer function that bypasses RLS to check admin status
    - Update RLS policies to use this function instead of direct table queries
    
  3. Changes
    - Drop existing problematic policies
    - Create new security definer function for admin check
    - Recreate policies using the new function
    
  4. Security
    - Security definer function is safe as it only checks read-only data
    - Function is owned by postgres and executes with elevated privileges
    - RLS policies still protect the table, just use a safe method to check admin status
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can remove roles" ON user_roles;

-- Create a security definer function to check if a user is an administrator
-- This function bypasses RLS to avoid infinite recursion
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
    AND r.name = 'administrator'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO authenticated;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view their own roles or admins can view all"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR is_user_admin(auth.uid())
  );

CREATE POLICY "Only admins can assign roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Only admins can remove roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (is_user_admin(auth.uid()));
