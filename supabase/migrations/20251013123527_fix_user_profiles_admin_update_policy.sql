/*
  # Fix User Profiles Update Policy for Administrators

  1. Changes
    - Drop existing restrictive update policy
    - Add new policy allowing administrators to update any user profile
    - Keep existing policy for users to update their own profile

  2. Security
    - Administrators can update any user profile (for user management)
    - Regular users can only update their own profile
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow administrators to update any user profile
CREATE POLICY "Administrators can update any user profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Administrator'
    )
  );
