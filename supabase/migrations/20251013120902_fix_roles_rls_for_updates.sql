/*
  # Fix Roles RLS Policies for Updates

  1. Changes
    - Drop and recreate the UPDATE policy on roles table
    - Use the is_user_admin() function instead of inline EXISTS query
    - This prevents infinite recursion and allows admins to update role names

  2. Security
    - Only administrators can update roles
    - Uses the helper function to check admin status
*/

-- Drop the old UPDATE policy
DROP POLICY IF EXISTS "Only admins can update roles" ON roles;

-- Create new UPDATE policy using the helper function
CREATE POLICY "Only admins can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));
