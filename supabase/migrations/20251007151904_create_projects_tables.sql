/*
  # Projects Management Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key) - Unique project identifier
      - `name` (text) - Project name
      - `description` (text) - Detailed project description
      - `status` (text) - Project status (planning, active, on_hold, completed, cancelled)
      - `health` (text) - Project health indicator (good, at_risk, poor)
      - `start_date` (date) - Project start date
      - `target_end_date` (date) - Target completion date
      - `actual_end_date` (date, nullable) - Actual completion date
      - `progress` (integer) - Completion percentage (0-100)
      - `budget` (numeric) - Total project budget
      - `spent` (numeric) - Amount spent so far
      - `location` (text) - Project location/address
      - `client_name` (text) - Client/owner name
      - `project_manager` (text) - Project manager name
      - `team_size` (integer) - Number of team members
      - `priority` (text) - Project priority (low, medium, high, critical)
      - `project_type` (text) - Type of project (commercial, residential, industrial, infrastructure)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

    - `project_milestones`
      - `id` (uuid, primary key) - Unique milestone identifier
      - `project_id` (uuid, foreign key) - Reference to projects table
      - `name` (text) - Milestone name
      - `description` (text) - Milestone description
      - `target_date` (date) - Target completion date
      - `actual_date` (date, nullable) - Actual completion date
      - `status` (text) - Milestone status (upcoming, in_progress, completed, at_risk)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their projects
    - Ensure data integrity with proper constraints

  3. Indexes
    - Add indexes on frequently queried columns for performance
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  health text NOT NULL DEFAULT 'good' CHECK (health IN ('good', 'at_risk', 'poor')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_end_date date NOT NULL,
  actual_end_date date,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget numeric(15, 2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  spent numeric(15, 2) NOT NULL DEFAULT 0 CHECK (spent >= 0),
  location text DEFAULT '',
  client_name text DEFAULT '',
  project_manager text DEFAULT '',
  team_size integer NOT NULL DEFAULT 0 CHECK (team_size >= 0),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  project_type text NOT NULL DEFAULT 'commercial' CHECK (project_type IN ('commercial', 'residential', 'industrial', 'infrastructure', 'other')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_milestones table
CREATE TABLE IF NOT EXISTS project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  target_date date NOT NULL,
  actual_date date,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'at_risk')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_health ON projects(health);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_target_date ON project_milestones(target_date);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies for projects table
CREATE POLICY "Allow authenticated users to view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for project_milestones table
CREATE POLICY "Allow authenticated users to view all milestones"
  ON project_milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert milestones"
  ON project_milestones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update milestones"
  ON project_milestones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete milestones"
  ON project_milestones FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_milestones_updated_at BEFORE UPDATE ON project_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
