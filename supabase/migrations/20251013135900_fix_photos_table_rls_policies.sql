/*
  # Fix Photos Table RLS Policies

  ## Problem
  Users can upload photos but cannot view them in the photos table because the SELECT policy
  requires user_project_assignments.

  ## Changes
  Update the photos table SELECT policy to allow:
  1. Users to view photos they uploaded (taken_by = auth.uid())
  2. Users to view photos in projects they're assigned to (existing logic)
  
  ## Security
  This maintains security while allowing users to view their own uploaded photos.
*/

-- Drop existing SELECT policy for photos table
DROP POLICY IF EXISTS "Users can view photos in their projects" ON photos;

-- Create new SELECT policy that allows users to view their own photos OR photos in assigned projects
CREATE POLICY "Users can view their own photos or photos in assigned projects"
  ON photos FOR SELECT
  TO authenticated
  USING (
    -- User uploaded the photo
    taken_by = auth.uid()
    OR
    -- User is assigned to the project
    EXISTS (
      SELECT 1 FROM user_project_assignments
      WHERE user_project_assignments.project_id = photos.project_id
      AND user_project_assignments.user_id = auth.uid()
    )
  );