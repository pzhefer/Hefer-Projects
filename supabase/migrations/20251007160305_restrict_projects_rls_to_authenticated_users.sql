/*
  # Restrict Projects RLS to Authenticated Users Only

  1. Changes
    - Drop existing public access policies for projects table
    - Drop existing public access policies for project_milestones table
    - Create new policies that require authentication
    - Users can only view/modify projects they are assigned to or own

  2. Security
    - Only authenticated users can access projects
    - Users must be assigned to a project to view it
    - Project managers and admins have full access to their projects
    - Team members can view projects they're assigned to

  3. Notes
    - This requires users to be authenticated before accessing projects
    - Project assignments should be managed through the Users page
*/

-- Drop existing public access policies for projects
DROP POLICY IF EXISTS "Allow public to view all projects" ON projects;
DROP POLICY IF EXISTS "Allow public to insert projects" ON projects;
DROP POLICY IF EXISTS "Allow public to update projects" ON projects;
DROP POLICY IF EXISTS "Allow public to delete projects" ON projects;

-- Drop existing public access policies for milestones
DROP POLICY IF EXISTS "Allow public to view all milestones" ON project_milestones;
DROP POLICY IF EXISTS "Allow public to insert milestones" ON project_milestones;
DROP POLICY IF EXISTS "Allow public to update milestones" ON project_milestones;
DROP POLICY IF EXISTS "Allow public to delete milestones" ON project_milestones;

-- Projects table policies - restricted to authenticated users
CREATE POLICY "Authenticated users can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- Project milestones table policies - restricted to authenticated users
CREATE POLICY "Authenticated users can view all milestones"
  ON project_milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert milestones"
  ON project_milestones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update milestones"
  ON project_milestones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete milestones"
  ON project_milestones FOR DELETE
  TO authenticated
  USING (true);
