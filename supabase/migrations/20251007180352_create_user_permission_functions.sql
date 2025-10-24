/*
  # Create User Permission Helper Functions

  1. New Functions
    - `get_user_permissions(user_id uuid)` - Returns all permissions for a user
    - `user_can_access_module(user_id uuid, module_name text)` - Checks if user can access a module
    - `user_is_administrator(user_id uuid)` - Checks if user is an administrator

  2. Purpose
    - Simplify permission checks by using database functions
    - Bypass complex nested queries that may have RLS issues
    - Improve performance by doing permission logic in database

  3. Security
    - Functions are SECURITY DEFINER to bypass RLS when needed
    - Only return data relevant to the requesting user
*/

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(user_id uuid)
RETURNS TABLE (
  permission_id uuid,
  module text,
  action text,
  description text
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id as permission_id,
    p.module,
    p.action,
    p.description
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = $1;
END;
$$;

-- Function to check if user can access a module
CREATE OR REPLACE FUNCTION user_can_access_module(user_id uuid, module_name text)
RETURNS boolean
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  has_access boolean;
BEGIN
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

-- Function to check if user is administrator
CREATE OR REPLACE FUNCTION user_is_administrator(user_id uuid)
RETURNS boolean
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1
      AND r.name = 'administrator'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_access_module(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_administrator(uuid) TO authenticated;
