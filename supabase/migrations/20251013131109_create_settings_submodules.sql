/*
  # Create Settings Module Submodules

  1. Overview
    - Adds submodules for the Settings main module
    - Provides granular permissions for different settings areas
    - Organizes system configuration and administrative features

  2. New Submodules
    - `users` - User Management (create, edit, deactivate users)
    - `roles_permissions` - Role & Permissions Management
    - `company_settings` - Company/Organization Settings
    - `project_settings` - Project configuration (statuses, categories, templates)
    - `system_preferences` - System-wide preferences (formats, units, etc.)
    - `departments` - Department Management
    - `audit_logs` - System activity and change tracking

  3. Permissions
    - Creates view, create, edit, delete permissions for each submodule
    - Assigns all permissions to administrator role
    - Assigns appropriate permissions to other roles

  4. Security
    - All operations respect existing RLS policies
    - Only administrators get full access to all settings by default
*/

-- Insert settings submodules
INSERT INTO submodules (name, display_name, parent_module, description) VALUES
  ('users', 'User Management', 'settings', 'Manage users and their access'),
  ('roles_permissions', 'Roles & Permissions', 'settings', 'Configure roles and their permissions'),
  ('company_settings', 'Company Settings', 'settings', 'Company information and branding'),
  ('project_settings', 'Project Settings', 'settings', 'Configure project defaults and templates'),
  ('system_preferences', 'System Preferences', 'settings', 'System-wide preferences and formats'),
  ('departments', 'Departments', 'settings', 'Manage organizational departments'),
  ('audit_logs', 'Audit Logs', 'settings', 'View system activity and changes')
ON CONFLICT (name) DO NOTHING;

-- Insert permissions for each settings sub-module
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
WHERE s.parent_module = 'settings'
ON CONFLICT (submodule_id, action) DO NOTHING;

-- Assign all settings sub-module permissions to administrator role
INSERT INTO role_submodule_permissions (role_id, submodule_permission_id)
SELECT r.id, sp.id
FROM roles r
CROSS JOIN submodule_permissions sp
JOIN submodules s ON sp.submodule_id = s.id
WHERE r.name = 'administrator' AND s.parent_module = 'settings'
ON CONFLICT (role_id, submodule_permission_id) DO NOTHING;

-- Assign view permissions for audit logs to project_manager and supervisor roles
INSERT INTO role_submodule_permissions (role_id, submodule_permission_id)
SELECT r.id, sp.id
FROM roles r
CROSS JOIN submodule_permissions sp
JOIN submodules s ON sp.submodule_id = s.id
WHERE r.name IN ('project_manager', 'supervisor')
  AND s.name = 'audit_logs'
  AND s.parent_module = 'settings'
  AND sp.action = 'view'
ON CONFLICT (role_id, submodule_permission_id) DO NOTHING;
