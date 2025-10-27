/*
  # Fix Photos RLS Policies

  ## Overview
  Updates Row Level Security policies for the photos table to allow all authenticated users
  to access photos, similar to how projects work in the system.

  ## Changes
  1. Drop existing restrictive RLS policies that require user_project_assignments
  2. Create new simplified policies that allow all authenticated users access
  3. Maintain ownership checks for update/delete operations

  ## Security
  - All authenticated users can view all photos
  - All authenticated users can upload photos to any project
  - Users can only update/delete their own photos
  - Storage bucket policies remain unchanged for file access control

  ## Important Notes
  - This aligns photos access with the projects access pattern
  - Project-level access control can be implemented later via user_project_assignments if needed
*/

-- Drop existing restrictive policies for photos table
DROP POLICY IF EXISTS "Users can view photos in their projects" ON photos;
DROP POLICY IF EXISTS "Users can upload photos to their projects" ON photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON photos;

-- Create new simplified RLS policies for photos
CREATE POLICY "Authenticated users can view all photos"
  ON photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload photos"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (taken_by = auth.uid());

CREATE POLICY "Users can update their own photos"
  ON photos FOR UPDATE
  TO authenticated
  USING (taken_by = auth.uid())
  WITH CHECK (taken_by = auth.uid());

CREATE POLICY "Users can delete their own photos"
  ON photos FOR DELETE
  TO authenticated
  USING (taken_by = auth.uid());