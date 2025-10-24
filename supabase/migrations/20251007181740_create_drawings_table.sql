/*
  # Create Drawings Management System

  1. New Tables
    - `drawings`
      - `id` (uuid, primary key) - Unique identifier for each drawing
      - `project_id` (uuid, foreign key) - Links drawing to a project
      - `drawing_number` (text) - Official drawing number/reference
      - `title` (text) - Drawing title/description
      - `discipline` (text) - Engineering discipline (Architectural, Structural, MEP, Civil, etc.)
      - `revision` (text) - Current revision number
      - `file_url` (text) - URL to the drawing file in storage
      - `file_name` (text) - Original filename
      - `file_size` (bigint) - File size in bytes
      - `file_type` (text) - MIME type of the file
      - `status` (text) - Drawing status (draft, for_review, approved, superseded)
      - `uploaded_by` (uuid, foreign key) - User who uploaded the drawing
      - `approved_by` (uuid, foreign key) - User who approved the drawing
      - `approved_at` (timestamptz) - Approval timestamp
      - `notes` (text) - Additional notes or comments
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      
    - `drawing_revisions`
      - `id` (uuid, primary key) - Unique identifier for revision history
      - `drawing_id` (uuid, foreign key) - Links to parent drawing
      - `revision` (text) - Revision number
      - `file_url` (text) - URL to the revision file
      - `file_name` (text) - Revision filename
      - `changes_description` (text) - Description of changes in this revision
      - `uploaded_by` (uuid, foreign key) - User who uploaded this revision
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on both tables
    - Authenticated users can view drawings for projects they have access to
    - Only authenticated users with proper permissions can upload/modify drawings
    - Drawing revisions are read-only for audit trail purposes

  3. Indexes
    - Add indexes on foreign keys for better query performance
    - Add index on drawing_number for fast lookups
*/

-- Create drawings table
CREATE TABLE IF NOT EXISTS drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_number text NOT NULL,
  title text NOT NULL,
  discipline text NOT NULL DEFAULT 'General',
  revision text NOT NULL DEFAULT 'A',
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'for_review', 'approved', 'superseded')),
  uploaded_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create drawing revisions table for version history
CREATE TABLE IF NOT EXISTS drawing_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id uuid NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  revision text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  changes_description text DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drawings_project_id ON drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_drawings_drawing_number ON drawings(drawing_number);
CREATE INDEX IF NOT EXISTS idx_drawings_status ON drawings(status);
CREATE INDEX IF NOT EXISTS idx_drawings_discipline ON drawings(discipline);
CREATE INDEX IF NOT EXISTS idx_drawing_revisions_drawing_id ON drawing_revisions(drawing_id);

-- Enable Row Level Security
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_revisions ENABLE ROW LEVEL SECURITY;

-- Drawings RLS Policies

-- Users can view drawings for projects they can access
CREATE POLICY "Users can view drawings for accessible projects"
  ON drawings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawings.project_id
    )
  );

-- Authenticated users can insert drawings
CREATE POLICY "Authenticated users can upload drawings"
  ON drawings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawings.project_id
    )
  );

-- Users can update drawings they uploaded or if they have proper access
CREATE POLICY "Users can update their own drawings"
  ON drawings FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

-- Only allow deletion by the uploader
CREATE POLICY "Users can delete their own drawings"
  ON drawings FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Drawing Revisions RLS Policies

-- Users can view revisions for drawings they can access
CREATE POLICY "Users can view drawing revisions"
  ON drawing_revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drawings
      WHERE drawings.id = drawing_revisions.drawing_id
    )
  );

-- Authenticated users can insert revisions
CREATE POLICY "Authenticated users can create revisions"
  ON drawing_revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM drawings
      WHERE drawings.id = drawing_revisions.drawing_id
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_drawings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_drawings_updated_at_trigger ON drawings;
CREATE TRIGGER update_drawings_updated_at_trigger
  BEFORE UPDATE ON drawings
  FOR EACH ROW
  EXECUTE FUNCTION update_drawings_updated_at();
