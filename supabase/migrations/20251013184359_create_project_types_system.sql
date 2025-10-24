/*
  # Create Project Types Management System

  ## Overview
  This migration creates a comprehensive project type management system with main types
  and subtypes. Projects can be associated with multiple subtypes.

  ## New Tables
  
  ### `project_types`
  Stores main project type categories (e.g., Residential, Commercial, Industrial)
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text, required, unique) - Name of the project type
  - `description` (text) - Description of the type
  - `display_order` (integer, default 0) - Order for sorting
  - `is_active` (boolean, default true) - Whether the type is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `project_subtypes`
  Stores project subtypes under main types (e.g., Family Homes, Residential Developments)
  - `id` (uuid, primary key) - Unique identifier
  - `project_type_id` (uuid, foreign key) - References parent project type
  - `name` (text, required) - Name of the subtype
  - `description` (text) - Description of the subtype
  - `display_order` (integer, default 0) - Order for sorting
  - `is_active` (boolean, default true) - Whether the subtype is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `project_subtype_assignments`
  Many-to-many relationship between projects and subtypes
  - `id` (uuid, primary key) - Unique identifier
  - `project_id` (uuid, foreign key) - References projects table
  - `project_subtype_id` (uuid, foreign key) - References project_subtypes table
  - `created_at` (timestamptz) - Assignment timestamp

  ## Security
  - Enable RLS on all tables
  - Authenticated users can view all types and subtypes
  - Only authenticated users can manage types (will be restricted further via app logic)

  ## Initial Data
  Populate with default project types and subtypes:
  - Residential: Family Homes, Residential Developments
  - Commercial: Office Buildings, Retail, Hospitality
  - Industrial: Manufacturing, Warehouses
  - Civil: Infrastructure, Roads & Bridges
  - Repair & Renovation: Refurbishment, Restoration

  ## Important Notes
  1. Projects can have multiple subtypes (many-to-many relationship)
  2. The old project_type column on projects table will be deprecated
  3. Subtypes are always linked to a main type
*/

-- Create project_types table
CREATE TABLE IF NOT EXISTS project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_subtypes table
CREATE TABLE IF NOT EXISTS project_subtypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type_id uuid NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_type_id, name)
);

-- Create project_subtype_assignments table (many-to-many)
CREATE TABLE IF NOT EXISTS project_subtype_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_subtype_id uuid NOT NULL REFERENCES project_subtypes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, project_subtype_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_types_display_order ON project_types(display_order);
CREATE INDEX IF NOT EXISTS idx_project_subtypes_type_id ON project_subtypes(project_type_id);
CREATE INDEX IF NOT EXISTS idx_project_subtypes_display_order ON project_subtypes(display_order);
CREATE INDEX IF NOT EXISTS idx_project_subtype_assignments_project ON project_subtype_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_subtype_assignments_subtype ON project_subtype_assignments(project_subtype_id);

-- Enable Row Level Security
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_subtypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_subtype_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_types
CREATE POLICY "Allow authenticated users to view project types"
  ON project_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert project types"
  ON project_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update project types"
  ON project_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete project types"
  ON project_types FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for project_subtypes
CREATE POLICY "Allow authenticated users to view project subtypes"
  ON project_subtypes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert project subtypes"
  ON project_subtypes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update project subtypes"
  ON project_subtypes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete project subtypes"
  ON project_subtypes FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for project_subtype_assignments
CREATE POLICY "Allow authenticated users to view subtype assignments"
  ON project_subtype_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert subtype assignments"
  ON project_subtype_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update subtype assignments"
  ON project_subtype_assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete subtype assignments"
  ON project_subtype_assignments FOR DELETE
  TO authenticated
  USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_project_types_updated_at BEFORE UPDATE ON project_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_subtypes_updated_at BEFORE UPDATE ON project_subtypes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default project types
INSERT INTO project_types (name, description, display_order) VALUES
  ('Residential', 'Residential construction projects including homes and developments', 1),
  ('Commercial', 'Commercial buildings and facilities', 2),
  ('Industrial', 'Industrial facilities and manufacturing plants', 3),
  ('Civil', 'Civil engineering and infrastructure projects', 4),
  ('Repair & Renovation', 'Renovation, refurbishment, and restoration projects', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert default project subtypes
INSERT INTO project_subtypes (project_type_id, name, description, display_order)
SELECT pt.id, subtype.name, subtype.description, subtype.display_order
FROM project_types pt
CROSS JOIN LATERAL (
  VALUES
    ('Family Homes', 'Single-family residential homes', 1),
    ('Residential Developments', 'Multi-unit residential developments and estates', 2)
) AS subtype(name, description, display_order)
WHERE pt.name = 'Residential'
ON CONFLICT (project_type_id, name) DO NOTHING;

INSERT INTO project_subtypes (project_type_id, name, description, display_order)
SELECT pt.id, subtype.name, subtype.description, subtype.display_order
FROM project_types pt
CROSS JOIN LATERAL (
  VALUES
    ('Office Buildings', 'Corporate offices and business centers', 1),
    ('Retail', 'Shopping centers, stores, and retail spaces', 2),
    ('Hospitality', 'Hotels, restaurants, and entertainment venues', 3)
) AS subtype(name, description, display_order)
WHERE pt.name = 'Commercial'
ON CONFLICT (project_type_id, name) DO NOTHING;

INSERT INTO project_subtypes (project_type_id, name, description, display_order)
SELECT pt.id, subtype.name, subtype.description, subtype.display_order
FROM project_types pt
CROSS JOIN LATERAL (
  VALUES
    ('Manufacturing', 'Manufacturing facilities and production plants', 1),
    ('Warehouses', 'Storage and distribution facilities', 2)
) AS subtype(name, description, display_order)
WHERE pt.name = 'Industrial'
ON CONFLICT (project_type_id, name) DO NOTHING;

INSERT INTO project_subtypes (project_type_id, name, description, display_order)
SELECT pt.id, subtype.name, subtype.description, subtype.display_order
FROM project_types pt
CROSS JOIN LATERAL (
  VALUES
    ('Infrastructure', 'Public infrastructure and utilities', 1),
    ('Roads & Bridges', 'Transportation infrastructure', 2)
) AS subtype(name, description, display_order)
WHERE pt.name = 'Civil'
ON CONFLICT (project_type_id, name) DO NOTHING;

INSERT INTO project_subtypes (project_type_id, name, description, display_order)
SELECT pt.id, subtype.name, subtype.description, subtype.display_order
FROM project_types pt
CROSS JOIN LATERAL (
  VALUES
    ('Refurbishment', 'Building refurbishment and modernization', 1),
    ('Restoration', 'Heritage and historical restoration', 2)
) AS subtype(name, description, display_order)
WHERE pt.name = 'Repair & Renovation'
ON CONFLICT (project_type_id, name) DO NOTHING;
