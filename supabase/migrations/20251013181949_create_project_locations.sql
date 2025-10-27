/*
  # Create Project Locations Table

  ## Overview
  This migration creates a table to manage hierarchical locations within projects.
  Locations can represent buildings, floors, rooms, or any other hierarchical structure.

  ## New Tables
  
  ### `project_locations`
  Stores hierarchical location data for projects
  - `id` (uuid, primary key) - Unique identifier for the location
  - `project_id` (uuid, foreign key) - References the parent project
  - `name` (text, required) - Name of the location (e.g., "Building A", "Floor 2", "Room 101")
  - `parent_id` (uuid, nullable, self-referencing foreign key) - References parent location for hierarchy
  - `location_type` (text, nullable) - Optional type descriptor (e.g., "building", "floor", "room")
  - `description` (text, nullable) - Additional description or notes
  - `display_order` (integer, default 0) - Order for sorting locations
  - `created_at` (timestamptz) - Timestamp of creation
  - `updated_at` (timestamptz) - Timestamp of last update
  - `created_by` (uuid, foreign key) - User who created the location

  ## Security
  - Enable Row Level Security (RLS) on `project_locations`
  - **SELECT Policy**: Authenticated users can view all locations
  - **INSERT Policy**: Authenticated users can create locations
  - **UPDATE Policy**: Authenticated users can update locations
  - **DELETE Policy**: Authenticated users can delete locations

  ## Indexes
  - Index on `project_id` for efficient querying by project
  - Index on `parent_id` for efficient hierarchical queries

  ## Important Notes
  1. Locations support unlimited hierarchical depth through parent_id relationship
  2. Deleting a location will cascade to all child locations
  3. Uses same permission model as projects table (all authenticated users have access)
*/

-- Create project_locations table
CREATE TABLE IF NOT EXISTS project_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES project_locations(id) ON DELETE CASCADE,
  location_type text,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_locations_project_id ON project_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_locations_parent_id ON project_locations(parent_id);

-- Enable Row Level Security
ALTER TABLE project_locations ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Authenticated users can view all locations
CREATE POLICY "Allow authenticated users to view all locations"
  ON project_locations FOR SELECT
  TO authenticated
  USING (true);

-- INSERT Policy: Authenticated users can create locations
CREATE POLICY "Allow authenticated users to insert locations"
  ON project_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE Policy: Authenticated users can update locations
CREATE POLICY "Allow authenticated users to update locations"
  ON project_locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE Policy: Authenticated users can delete locations
CREATE POLICY "Allow authenticated users to delete locations"
  ON project_locations FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_project_locations_updated_at BEFORE UPDATE ON project_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
