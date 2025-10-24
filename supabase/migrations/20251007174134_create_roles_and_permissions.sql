/*
  # Role-Based Access Control System

  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Role name (e.g., administrator, project_manager, supervisor, worker, viewer)
      - `description` (text) - Description of the role
      - `created_at` (timestamptz)

    - `permissions`
      - `id` (uuid, primary key)
      - `module` (text) - Module name (projects, plant, stock, employees)
      - `action` (text) - Action (view, create, edit, delete, manage)
      - `description` (text)
      - `created_at` (timestamptz)

    - `role_permissions`
      - `id` (uuid, primary key)
      - `role_id` (uuid, foreign key) - Reference to roles
      - `permission_id` (uuid, foreign key) - Reference to permissions
      - `created_at` (timestamptz)

    - `user_roles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - Reference to user_profiles
      - `role_id` (uuid, foreign key) - Reference to roles
      - `assigned_at` (timestamptz)
      - `assigned_by` (uuid) - User who assigned the role

  2. Security
    - Enable RLS on all tables
    - Only administrators can manage roles and permissions
    - All authenticated users can view roles
    - Users can view their own role assignments

  3. Initial Data
    - Creates standard roles: administrator, project_manager, supervisor, worker, viewer
    - Creates permissions for each module and action
    - Assigns appropriate permissions to each role
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL CHECK (module IN ('projects', 'plant', 'stock', 'employees', 'settings', 'all')),
  action text NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'manage')),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES user_profiles(id),
  UNIQUE(user_id, role_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles
CREATE POLICY "All users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON roles FOR ALL
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

-- RLS Policies for permissions
CREATE POLICY "All users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage permissions"
  ON permissions FOR ALL
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

-- RLS Policies for role_permissions
CREATE POLICY "All users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage role permissions"
  ON role_permissions FOR ALL
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

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
  ));

CREATE POLICY "Only admins can assign roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

CREATE POLICY "Only admins can remove roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
    )
  );

-- Insert standard roles
INSERT INTO roles (name, description) VALUES
  ('administrator', 'Full system access with ability to manage users, roles, and all modules'),
  ('project_manager', 'Can manage projects and view most operational data'),
  ('plant_manager', 'Can manage plant/equipment and related operations'),
  ('stock_manager', 'Can manage inventory and stock operations'),
  ('hr_manager', 'Can manage employees and user assignments'),
  ('supervisor', 'Can view and edit assigned projects and resources'),
  ('worker', 'Can view assigned tasks and update their status'),
  ('viewer', 'Read-only access to assigned modules')
ON CONFLICT (name) DO NOTHING;

-- Insert permissions for all modules and actions
INSERT INTO permissions (module, action, description) VALUES
  ('all', 'manage', 'Full access to all modules and settings'),
  ('projects', 'view', 'View projects and related data'),
  ('projects', 'create', 'Create new projects'),
  ('projects', 'edit', 'Edit existing projects'),
  ('projects', 'delete', 'Delete projects'),
  ('projects', 'manage', 'Full project management access'),
  ('plant', 'view', 'View plant and equipment data'),
  ('plant', 'create', 'Add new plant and equipment'),
  ('plant', 'edit', 'Edit plant and equipment records'),
  ('plant', 'delete', 'Delete plant and equipment'),
  ('plant', 'manage', 'Full plant management access'),
  ('stock', 'view', 'View inventory and stock data'),
  ('stock', 'create', 'Add new stock items'),
  ('stock', 'edit', 'Edit stock records'),
  ('stock', 'delete', 'Delete stock items'),
  ('stock', 'manage', 'Full stock management access'),
  ('employees', 'view', 'View employee data'),
  ('employees', 'create', 'Add new employees'),
  ('employees', 'edit', 'Edit employee records'),
  ('employees', 'delete', 'Delete employee records'),
  ('employees', 'manage', 'Full employee management access'),
  ('settings', 'view', 'View system settings'),
  ('settings', 'manage', 'Manage system settings and configuration')
ON CONFLICT (module, action) DO NOTHING;

-- Assign permissions to administrator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'administrator';

-- Assign permissions to project_manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'project_manager'
  AND (
    p.module = 'projects' OR
    (p.module IN ('plant', 'stock', 'employees') AND p.action IN ('view', 'edit'))
  );

-- Assign permissions to plant_manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'plant_manager'
  AND (
    p.module = 'plant' OR
    (p.module IN ('projects', 'stock') AND p.action = 'view')
  );

-- Assign permissions to stock_manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'stock_manager'
  AND (
    p.module = 'stock' OR
    (p.module IN ('projects', 'plant') AND p.action = 'view')
  );

-- Assign permissions to hr_manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'hr_manager'
  AND (
    p.module = 'employees' OR
    (p.module = 'projects' AND p.action = 'view')
  );

-- Assign permissions to supervisor role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'supervisor'
  AND p.action IN ('view', 'edit')
  AND p.module IN ('projects', 'plant', 'stock');

-- Assign permissions to worker role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'worker'
  AND p.action = 'view'
  AND p.module IN ('projects', 'plant', 'stock');

-- Assign permissions to viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer'
  AND p.action = 'view';

-- Update handle_new_user function to assign default viewer role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  viewer_role_id uuid;
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  SELECT id INTO viewer_role_id FROM roles WHERE name = 'viewer' LIMIT 1;
  
  IF viewer_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, viewer_role_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;