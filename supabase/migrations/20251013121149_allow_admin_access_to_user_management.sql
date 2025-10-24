/*
  # Allow Administrator Access to User Management

  1. Changes
    - Update user_can_access_module function to grant automatic access to 'user-management' module for administrators
    - Administrators should always have access to user management regardless of specific permissions

  2. Security
    - Only users with the 'administrator' role can access user-management
    - All other modules still require explicit permissions
*/

-- Update the function to grant administrators automatic access to user-management
CREATE OR REPLACE FUNCTION user_can_access_module(user_id uuid, module_name text)
RETURNS boolean
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  has_access boolean;
  is_admin boolean;
BEGIN
  -- Check if user is an administrator
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1
      AND r.name = 'administrator'
  ) INTO is_admin;
  
  -- Administrators automatically have access to user-management
  IF is_admin AND module_name = 'user-management' THEN
    RETURN true;
  END IF;
  
  -- For all other modules, check specific permissions
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = $1
      AND (
        (p.module = module_name AND p.action IN ('view', 'create', 'edit', 'delete', 'manage'))
        OR (p.module = 'all' AND p.action = 'manage')
      )
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;
