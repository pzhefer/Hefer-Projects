/*
  # Fix Projects RLS Policies

  1. Changes
    - Drop existing restrictive policies
    - Create new policies that allow public access for development
    - These can be made more restrictive later when auth is added

  2. Security
    - For now, allowing public access to enable testing
    - In production, these should be restricted to authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view all projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to delete projects" ON projects;

DROP POLICY IF EXISTS "Allow authenticated users to view all milestones" ON project_milestones;
DROP POLICY IF EXISTS "Allow authenticated users to insert milestones" ON project_milestones;
DROP POLICY IF EXISTS "Allow authenticated users to update milestones" ON project_milestones;
DROP POLICY IF EXISTS "Allow authenticated users to delete milestones" ON project_milestones;

-- Create new policies that allow public access for development
-- Projects table policies
CREATE POLICY "Allow public to view all projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Allow public to insert projects"
  ON projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update projects"
  ON projects FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete projects"
  ON projects FOR DELETE
  USING (true);

-- Project milestones table policies
CREATE POLICY "Allow public to view all milestones"
  ON project_milestones FOR SELECT
  USING (true);

CREATE POLICY "Allow public to insert milestones"
  ON project_milestones FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update milestones"
  ON project_milestones FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete milestones"
  ON project_milestones FOR DELETE
  USING (true);
