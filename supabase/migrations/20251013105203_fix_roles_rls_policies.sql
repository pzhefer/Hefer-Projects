/*
  # Fix Roles RLS Policies

  1. Changes
    - Drop the overly broad "Only admins can manage roles" policy
    - Create separate policies for INSERT, UPDATE, DELETE operations on roles table
    - This ensures administrators can properly create, edit, and delete roles

  2. Security
    - Maintains admin-only access for role management
    - Uses explicit policies for each operation type
    - SELECT policy remains unchanged (all authenticated users can view roles)
*/

-- Drop the problematic "FOR ALL" policy
DROP POLICY IF EXISTS "Only admins can manage roles" ON roles;

-- Create separate policies for each operation
CREATE POLICY "Only admins can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

CREATE POLICY "Only admins can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

CREATE POLICY "Only admins can delete roles"
  ON roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

-- Fix permissions table policies as well
DROP POLICY IF EXISTS "Only admins can manage permissions" ON permissions;

CREATE POLICY "Only admins can insert permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

CREATE POLICY "Only admins can update permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

CREATE POLICY "Only admins can delete permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

-- Fix role_permissions table policies as well
DROP POLICY IF EXISTS "Only admins can manage role permissions" ON role_permissions;

CREATE POLICY "Only admins can insert role permissions"
  ON role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

CREATE POLICY "Only admins can update role permissions"
  ON role_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

CREATE POLICY "Only admins can delete role permissions"
  ON role_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );