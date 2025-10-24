/*
  # Enhanced Drawings Schema for Construction Management

  1. New Tables
    - `drawing_sets` - Organize drawings into sets/folders (e.g., by trade, discipline, building)
    - `drawing_sheets` - Individual sheets within a drawing with sheet numbers and versions
    - `drawing_versions` - Track all versions of each sheet with comparison capabilities
    - `drawing_hyperlinks` - Links between related drawings for navigation
    - `drawing_markups` - Annotations, redlines, and comments on drawings
    - `drawing_tags` - Tagging system for filtering and organization
    - `drawing_issues` - Tasks/issues pinned to specific locations on drawings
    
  2. Enhanced Features
    - Sheet-based organization like Fieldwire and Procore
    - Version tracking with automatic transfer of markups
    - Markup tools (pen, highlighter, shapes, text, photos)
    - Hyperlink navigation between sheets
    - Task/issue location tracking on drawings
    - Tag-based filtering and organization
    
  3. Security
    - All tables use RLS for authenticated access
    - Users can only modify their own markups
    - Version history is immutable for audit trail
*/

-- Drawing Sets (Folders/Collections)
CREATE TABLE IF NOT EXISTS drawing_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  discipline text,
  parent_set_id uuid REFERENCES drawing_sets(id) ON DELETE CASCADE,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drawing Sheets (Individual drawings within sets)
CREATE TABLE IF NOT EXISTS drawing_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid REFERENCES drawing_sets(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sheet_number text NOT NULL,
  sheet_name text NOT NULL,
  discipline text NOT NULL DEFAULT 'General',
  current_version_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'for_review', 'approved', 'superseded', 'as_built')),
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drawing Versions (Version history for each sheet)
CREATE TABLE IF NOT EXISTS drawing_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  version_number text NOT NULL,
  version_date date DEFAULT CURRENT_DATE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  thumbnail_url text,
  changes_description text DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id),
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Drawing Hyperlinks (Links between sheets)
CREATE TABLE IF NOT EXISTS drawing_hyperlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_sheet_id uuid NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  target_sheet_id uuid NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  link_text text,
  x_coordinate decimal,
  y_coordinate decimal,
  created_at timestamptz DEFAULT now()
);

-- Drawing Markups (Annotations and redlines)
CREATE TABLE IF NOT EXISTS drawing_markups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  version_id uuid REFERENCES drawing_versions(id) ON DELETE CASCADE,
  markup_type text NOT NULL CHECK (markup_type IN ('pen', 'highlighter', 'line', 'arrow', 'rectangle', 'circle', 'cloud', 'text', 'photo', 'measurement')),
  data jsonb NOT NULL,
  color text DEFAULT '#FF0000',
  stroke_width decimal DEFAULT 2,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drawing Tags
CREATE TABLE IF NOT EXISTS drawing_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, name)
);

-- Drawing Sheet Tags (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS drawing_sheet_tags (
  sheet_id uuid NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES drawing_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (sheet_id, tag_id)
);

-- Drawing Issues (Tasks/Problems pinned to drawings)
CREATE TABLE IF NOT EXISTS drawing_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  issue_type text NOT NULL CHECK (issue_type IN ('rfi', 'snag', 'observation', 'change', 'clash', 'general')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  x_coordinate decimal NOT NULL,
  y_coordinate decimal NOT NULL,
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drawing_sets_project_id ON drawing_sets(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_project_id ON drawing_sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_set_id ON drawing_sheets(set_id);
CREATE INDEX IF NOT EXISTS idx_drawing_versions_sheet_id ON drawing_versions(sheet_id);
CREATE INDEX IF NOT EXISTS idx_drawing_markups_sheet_id ON drawing_markups(sheet_id);
CREATE INDEX IF NOT EXISTS idx_drawing_issues_sheet_id ON drawing_issues(sheet_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sheet_tags_sheet_id ON drawing_sheet_tags(sheet_id);

-- Enable Row Level Security
ALTER TABLE drawing_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_hyperlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_markups ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_sheet_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Drawing Sets
CREATE POLICY "Users can view drawing sets for accessible projects"
  ON drawing_sets FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_sets.project_id));

CREATE POLICY "Authenticated users can create drawing sets"
  ON drawing_sets FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_sets.project_id));

CREATE POLICY "Authenticated users can update drawing sets"
  ON drawing_sets FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_sets.project_id));

CREATE POLICY "Authenticated users can delete drawing sets"
  ON drawing_sets FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_sets.project_id));

-- RLS Policies for Drawing Sheets
CREATE POLICY "Users can view drawing sheets for accessible projects"
  ON drawing_sheets FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_sheets.project_id));

CREATE POLICY "Authenticated users can create drawing sheets"
  ON drawing_sheets FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_sheets.project_id));

CREATE POLICY "Authenticated users can update drawing sheets"
  ON drawing_sheets FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_sheets.project_id));

CREATE POLICY "Authenticated users can delete drawing sheets"
  ON drawing_sheets FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_sheets.project_id));

-- RLS Policies for Drawing Versions
CREATE POLICY "Users can view drawing versions"
  ON drawing_versions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM drawing_sheets WHERE drawing_sheets.id = drawing_versions.sheet_id));

CREATE POLICY "Authenticated users can create drawing versions"
  ON drawing_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- RLS Policies for Drawing Hyperlinks
CREATE POLICY "Users can view drawing hyperlinks"
  ON drawing_hyperlinks FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM drawing_sheets WHERE drawing_sheets.id = drawing_hyperlinks.source_sheet_id));

CREATE POLICY "Authenticated users can create hyperlinks"
  ON drawing_hyperlinks FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM drawing_sheets WHERE drawing_sheets.id = drawing_hyperlinks.source_sheet_id));

CREATE POLICY "Authenticated users can delete hyperlinks"
  ON drawing_hyperlinks FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM drawing_sheets WHERE drawing_sheets.id = drawing_hyperlinks.source_sheet_id));

-- RLS Policies for Drawing Markups
CREATE POLICY "Users can view drawing markups"
  ON drawing_markups FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM drawing_sheets WHERE drawing_sheets.id = drawing_markups.sheet_id));

CREATE POLICY "Authenticated users can create markups"
  ON drawing_markups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own markups"
  ON drawing_markups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own markups"
  ON drawing_markups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for Drawing Tags
CREATE POLICY "Users can view drawing tags"
  ON drawing_tags FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_tags.project_id));

CREATE POLICY "Authenticated users can create drawing tags"
  ON drawing_tags FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_tags.project_id));

CREATE POLICY "Authenticated users can delete drawing tags"
  ON drawing_tags FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_tags.project_id));

-- RLS Policies for Drawing Sheet Tags
CREATE POLICY "Users can view drawing sheet tags"
  ON drawing_sheet_tags FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM drawing_sheets WHERE drawing_sheets.id = drawing_sheet_tags.sheet_id));

CREATE POLICY "Authenticated users can manage sheet tags"
  ON drawing_sheet_tags FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM drawing_sheets WHERE drawing_sheets.id = drawing_sheet_tags.sheet_id));

-- RLS Policies for Drawing Issues
CREATE POLICY "Users can view drawing issues"
  ON drawing_issues FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM drawing_sheets WHERE drawing_sheets.id = drawing_issues.sheet_id));

CREATE POLICY "Authenticated users can create issues"
  ON drawing_issues FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update issues"
  ON drawing_issues FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM drawing_sheets WHERE drawing_sheets.id = drawing_issues.sheet_id));

CREATE POLICY "Authenticated users can delete issues"
  ON drawing_issues FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Update triggers for updated_at fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_drawing_sets_updated_at
  BEFORE UPDATE ON drawing_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drawing_sheets_updated_at
  BEFORE UPDATE ON drawing_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drawing_markups_updated_at
  BEFORE UPDATE ON drawing_markups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drawing_issues_updated_at
  BEFORE UPDATE ON drawing_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
