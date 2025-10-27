/*
  # Create Drawing Symbols System

  1. New Tables
    - `drawing_symbols`
      - `id` (uuid, primary key)
      - `name` (text) - Symbol name (e.g., "Light Switch", "Fire Extinguisher")
      - `category` (text) - Category (electrical, plumbing, hvac, fire_safety, structural, general)
      - `svg_path` (text) - SVG path data for the symbol
      - `is_custom` (boolean) - Whether this is a custom user-created symbol
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `is_active` (boolean) - Whether symbol is available for use

  2. Security
    - Enable RLS on `drawing_symbols` table
    - Add policies for authenticated users to read all active symbols
    - Add policies for users to create and manage their own custom symbols
    - Add policy for administrators to manage all symbols
*/

-- Create drawing_symbols table
CREATE TABLE IF NOT EXISTS drawing_symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('electrical', 'plumbing', 'hvac', 'fire_safety', 'structural', 'general')),
  svg_path text NOT NULL,
  view_box text DEFAULT '0 0 24 24',
  is_custom boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE drawing_symbols ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active symbols
CREATE POLICY "Anyone can view active symbols"
  ON drawing_symbols
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Users can create custom symbols
CREATE POLICY "Users can create custom symbols"
  ON drawing_symbols
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_custom = true);

-- Policy: Users can update their own custom symbols
CREATE POLICY "Users can update own custom symbols"
  ON drawing_symbols
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND is_custom = true)
  WITH CHECK (created_by = auth.uid() AND is_custom = true);

-- Policy: Users can delete their own custom symbols
CREATE POLICY "Users can delete own custom symbols"
  ON drawing_symbols
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() AND is_custom = true);

-- Policy: Administrators can manage all symbols
CREATE POLICY "Administrators can manage all symbols"
  ON drawing_symbols
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND LOWER(r.name) = 'administrator'
    )
  );

-- Insert default symbols for each category

-- ELECTRICAL SYMBOLS
INSERT INTO drawing_symbols (name, category, svg_path, view_box, is_custom) VALUES
('Light Fixture', 'electrical', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z', '0 0 24 24', false),
('Outlet', 'electrical', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1zm4 0c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1zm0-6c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1zm-4 0c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1z', '0 0 24 24', false),
('Switch', 'electrical', 'M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z', '0 0 24 24', false),
('Junction Box', 'electrical', 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2v-4h4v-2h-4V7h-2v4H7v2h4z', '0 0 24 24', false),
('Panel', 'electrical', 'M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h10v2H7zm0 4h10v2H7zm0 4h10v2H7z', '0 0 24 24', false);

-- PLUMBING SYMBOLS
INSERT INTO drawing_symbols (name, category, svg_path, view_box, is_custom) VALUES
('Sink', 'plumbing', 'M21 13c-1.1 0-2 .9-2 2v4H5v-4c0-1.1-.9-2-2-2s-2 .9-2 2v5c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-5c0-1.1-.9-2-2-2zM5 10h14c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1 .45-1 1s.45 1 1 1zm7-9c-3.86 0-7 3.14-7 7h14c0-3.86-3.14-7-7-7z', '0 0 24 24', false),
('Toilet', 'plumbing', 'M19 8H5c-1.66 0-3 1.34-3 3v6c0 1.66 1.34 3 3 3h14c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3zm1 9c0 .55-.45 1-1 1H5c-.55 0-1-.45-1-1v-6c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v6zM6 4h12v2H6z', '0 0 24 24', false),
('Shower', 'plumbing', 'M12 2C9.79 2 8 3.79 8 6c0 1.86 1.28 3.41 3 3.86V21h2V9.86c1.72-.45 3-2 3-3.86 0-2.21-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z', '0 0 24 24', false),
('Water Heater', 'plumbing', 'M7 2v11h3v9l7-12h-4l4-8z', '0 0 24 24', false),
('Floor Drain', 'plumbing', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z', '0 0 24 24', false);

-- HVAC SYMBOLS
INSERT INTO drawing_symbols (name, category, svg_path, view_box, is_custom) VALUES
('Air Vent', 'hvac', 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h10v2H7zm0 4h10v2H7zm0 4h10v2H7z', '0 0 24 24', false),
('Ductwork', 'hvac', 'M3 3v18h18V3H3zm16 16H5V5h14v14zm-2-2H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z', '0 0 24 24', false),
('Thermostat', 'hvac', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z', '0 0 24 24', false),
('Exhaust Fan', 'hvac', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18l-4-4 1.41-1.41L11 16.17V7.83L9.41 9.41 8 8l4-4 4 4-1.41 1.41L13 7.83v8.34l1.59-1.59L16 16l-4 4z', '0 0 24 24', false),
('AC Unit', 'hvac', 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-11c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z', '0 0 24 24', false);

-- FIRE SAFETY SYMBOLS
INSERT INTO drawing_symbols (name, category, svg_path, view_box, is_custom) VALUES
('Fire Extinguisher', 'fire_safety', 'M7 3v2h4V3H7zm3 3C7.24 6 5 8.24 5 11v10c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V11c0-2.76-2.24-5-5-5h-4zm4 0h2v2h-2V6zm0 4h2v2h-2v-2z', '0 0 24 24', false),
('Fire Alarm', 'fire_safety', 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z', '0 0 24 24', false),
('Sprinkler Head', 'fire_safety', 'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z', '0 0 24 24', false),
('Exit Sign', 'fire_safety', 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v4H7zm8 0h2v4h-2zm-8 5h10v2H7z', '0 0 24 24', false),
('Fire Hose', 'fire_safety', 'M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z', '0 0 24 24', false);

-- STRUCTURAL SYMBOLS
INSERT INTO drawing_symbols (name, category, svg_path, view_box, is_custom) VALUES
('Column', 'structural', 'M8 2h8v20H8V2zm2 2v16h4V4h-4z', '0 0 24 24', false),
('Beam', 'structural', 'M2 8h20v8H2V8zm2 2v4h16v-4H4z', '0 0 24 24', false),
('Wall', 'structural', 'M2 2h20v20H2V2zm2 2v16h16V4H4zm2 2h12v2H6V6zm0 4h12v2H6v-2zm0 4h12v2H6v-2z', '0 0 24 24', false),
('Door', 'structural', 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-9-8c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z', '0 0 24 24', false),
('Window', 'structural', 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-7h7V5h-7v7zm-1 1H5v7h6v-7z', '0 0 24 24', false);

-- GENERAL SYMBOLS
INSERT INTO drawing_symbols (name, category, svg_path, view_box, is_custom) VALUES
('North Arrow', 'general', 'M12 2L4 9h5v11h6V9h5l-8-7z', '0 0 24 24', false),
('Dimension', 'general', 'M3 12h18M3 12l3-3m-3 3l3 3m15-3l-3-3m3 3l-3 3', '0 0 24 24', false),
('Elevation Mark', 'general', 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l7.4 3.7L12 11.58 4.6 7.88 12 4.18zM4 9.82l7 3.5v7.36l-7-3.5V9.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z', '0 0 24 24', false),
('Section Cut', 'general', 'M3 12h8l4 8h-8l-4-8zm18 0h-8l-4 8h8l4-8z', '0 0 24 24', false),
('Detail Mark', 'general', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z', '0 0 24 24', false);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_drawing_symbols_category ON drawing_symbols(category);
CREATE INDEX IF NOT EXISTS idx_drawing_symbols_active ON drawing_symbols(is_active);
