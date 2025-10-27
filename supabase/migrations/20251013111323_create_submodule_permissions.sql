/*
  # Sub-Module Permissions System

  1. Overview
    - Extends the existing permissions system to support sub-modules
    - Sub-modules are specific features within main modules (e.g., drawings, photos, tasks within projects)
    - Allows granular control over CRUD operations per role per sub-module

  2. New Tables
    - `submodules`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Technical name (e.g., 'drawings', 'photos', 'tasks')
      - `display_name` (text) - Human-readable name
      - `parent_module` (text) - Parent module (e.g., 'projects')
      - `description` (text)
      - `created_at` (timestamptz)

    - `submodule_permissions`
      - `id` (uuid, primary key)
      - `submodule_id` (uuid, foreign key)
      - `action` (text) - Action (view, create, edit, delete)
      - `description` (text)
      - `created_at` (timestamptz)

    - `role_submodule_permissions`
      - `id` (uuid, primary key)
      - `role_id` (uuid, foreign key)
      - `submodule_permission_id` (uuid, foreign key)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on all tables
    - All authenticated users can view sub-modules and their permissions
    - Only administrators can manage sub-module permissions

  4. Initial Data
    - Creates sub-modules for projects: drawings, photos, tasks, documents
    - Creates permissions for each sub-module and action
    - Assigns appropriate permissions to each role based on their main module access
*/

-- Create submodules table
CREATE TABLE IF NOT EXISTS submodules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  parent_module text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create submodule_permissions table
CREATE TABLE IF NOT EXISTS submodule_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submodule_id uuid NOT NULL REFERENCES submodules(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete')),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(submodule_id, action)
);

-- Create role_submodule_permissions junction table
CREATE TABLE IF NOT EXISTS role_submodule_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  submodule_permission_id uuid NOT NULL REFERENCES submodule_permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, submodule_permission_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_submodule_permissions_submodule_id ON submodule_permissions(submodule_id);
CREATE INDEX IF NOT EXISTS idx_role_submodule_permissions_role_id ON role_submodule_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_submodule_permissions_permission_id ON role_submodule_permissions(submodule_permission_id);

-- Enable Row Level Security
ALTER TABLE submodules ENABLE ROW LEVEL SECURITY;
ALTER TABLE submodule_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_submodule_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for submodules
CREATE POLICY "All users can view submodules"
  ON submodules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage submodules"
  ON submodules FOR ALL
  TO authenticated
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- RLS Policies for submodule_permissions
CREATE POLICY "All users can view submodule permissions"
  ON submodule_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage submodule permissions"
  ON submodule_permissions FOR ALL
  TO authenticated
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- RLS Policies for role_submodule_permissions
CREATE POLICY "All users can view role submodule permissions"
  ON role_submodule_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage role submodule permissions"
  ON role_submodule_permissions FOR ALL
  TO authenticated
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- Insert sub-modules for projects module
INSERT INTO submodules (name, display_name, parent_module, description) VALUES
  ('drawings', 'Drawings', 'projects', 'Project drawings and blueprints'),
  ('photos', 'Photos', 'projects', 'Project photos and images'),
  ('tasks', 'Tasks', 'projects', 'Project tasks and assignments'),
  ('documents', 'Documents', 'projects', 'Project documents and files')
ON CONFLICT (name) DO NOTHING;

-- Insert permissions for each sub-module (view, create, edit, delete)
INSERT INTO submodule_permissions (submodule_id, action, description)
SELECT s.id, a.action, CONCAT(a.action_display, ' ', s.display_name)
FROM submodules s
CROSS JOIN (
  VALUES 
    ('view', 'View'),
    ('create', 'Create'),
    ('edit', 'Edit'),
    ('delete', 'Delete')
) AS a(action, action_display)
ON CONFLICT (submodule_id, action) DO NOTHING;

-- Assign all sub-module permissions to administrator role
INSERT INTO role_submodule_permissions (role_id, submodule_permission_id)
SELECT r.id, sp.id
FROM roles r
CROSS JOIN submodule_permissions sp
WHERE r.name = 'administrator'
ON CONFLICT (role_id, submodule_permission_id) DO NOTHING;

-- Assign sub-module permissions to project_manager role (all actions for all project sub-modules)
INSERT INTO role_submodule_permissions (role_id, submodule_permission_id)
SELECT r.id, sp.id
FROM roles r
CROSS JOIN submodule_permissions sp
JOIN submodules s ON sp.submodule_id = s.id
WHERE r.name = 'project_manager' AND s.parent_module = 'projects'
ON CONFLICT (role_id, submodule_permission_id) DO NOTHING;

-- Assign sub-module permissions to supervisor role (view and edit for all project sub-modules)
INSERT INTO role_submodule_permissions (role_id, submodule_permission_id)
SELECT r.id, sp.id
FROM roles r
CROSS JOIN submodule_permissions sp
JOIN submodules s ON sp.submodule_id = s.id
WHERE r.name = 'supervisor' 
  AND s.parent_module = 'projects'
  AND sp.action IN ('view', 'edit')
ON CONFLICT (role_id, submodule_permission_id) DO NOTHING;

-- Assign sub-module permissions to worker role (view only for all project sub-modules, edit for tasks)
INSERT INTO role_submodule_permissions (role_id, submodule_permission_id)
SELECT r.id, sp.id
FROM roles r
CROSS JOIN submodule_permissions sp
JOIN submodules s ON sp.submodule_id = s.id
WHERE r.name = 'worker' 
  AND s.parent_module = 'projects'
  AND (
    sp.action = 'view' OR
    (s.name = 'tasks' AND sp.action = 'edit')
  )
ON CONFLICT (role_id, submodule_permission_id) DO NOTHING;

-- Assign sub-module permissions to viewer role (view only for all project sub-modules)
INSERT INTO role_submodule_permissions (role_id, submodule_permission_id)
SELECT r.id, sp.id
FROM roles r
CROSS JOIN submodule_permissions sp
JOIN submodules s ON sp.submodule_id = s.id
WHERE r.name = 'viewer' 
  AND s.parent_module = 'projects'
  AND sp.action = 'view'
ON CONFLICT (role_id, submodule_permission_id) DO NOTHING;

-- Create helper function to check if user has sub-module permission
CREATE OR REPLACE FUNCTION user_has_submodule_permission(
  check_user_id uuid,
  submodule_name text,
  required_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_submodule_permissions rsp ON ur.role_id = rsp.role_id
    JOIN submodule_permissions sp ON rsp.submodule_permission_id = sp.id
    JOIN submodules s ON sp.submodule_id = s.id
    WHERE ur.user_id = check_user_id
      AND s.name = submodule_name
      AND sp.action = required_action
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_has_submodule_permission(uuid, text, text) TO authenticated;
