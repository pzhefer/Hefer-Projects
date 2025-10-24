/*
  # Remove project-specific role column

  1. Changes
    - Drop the `role_in_project` column from `user_project_assignments` table
    - Users will be assigned to projects without specific project roles
    - Their system-wide role from `user_profiles.role` determines their permissions

  2. Notes
    - Simplifies team management by removing redundant role assignment
    - System-wide roles (Administrator, Manager, User) are sufficient for access control
*/

-- Remove the role_in_project column and its constraint
ALTER TABLE user_project_assignments 
DROP COLUMN IF EXISTS role_in_project;
