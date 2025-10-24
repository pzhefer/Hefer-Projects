/*
  # Fix Photos Storage RLS Policies

  ## Problem
  Users can upload photos but cannot view them because the SELECT policy requires
  user_project_assignments, which may not exist when photos are uploaded.

  ## Changes
  Update the storage.objects SELECT policy for photos bucket to allow:
  1. Users to view photos they uploaded (taken_by = auth.uid())
  2. Users to view photos in projects they're assigned to (existing logic)
  
  ## Security
  This maintains security while allowing users to view their own uploaded photos.
*/

-- Drop existing SELECT policy for photos storage bucket
DROP POLICY IF EXISTS "Users can view photos in their projects" ON storage.objects;

-- Create new SELECT policy that allows users to view their own photos OR photos in assigned projects
CREATE POLICY "Users can view photos in their projects or their own photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      -- User uploaded the photo
      EXISTS (
        SELECT 1 FROM photos
        WHERE photos.file_path = storage.objects.name
        AND photos.taken_by = auth.uid()
      )
      OR
      -- User is assigned to the project
      EXISTS (
        SELECT 1 FROM photos
        JOIN user_project_assignments ON user_project_assignments.project_id = photos.project_id
        WHERE photos.file_path = storage.objects.name
        AND user_project_assignments.user_id = auth.uid()
      )
    )
  );