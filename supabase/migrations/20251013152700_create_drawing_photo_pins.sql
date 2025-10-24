/*
  # Create Drawing Photo Pins System

  1. New Table
    - `drawing_photo_pins`
      - `id` (uuid, primary key) - Unique identifier
      - `sheet_id` (uuid, foreign key) - Links to drawing sheet
      - `photo_id` (uuid, foreign key) - Links to photo
      - `x_coordinate` (decimal) - X position on drawing (0-1 normalized)
      - `y_coordinate` (decimal) - Y position on drawing (0-1 normalized)
      - `label` (text) - Optional label for the location (e.g., "Column A5", "North Wall")
      - `description` (text) - Description of what's being tracked
      - `sequence` (integer) - Chronological order for progress tracking
      - `created_by` (uuid, foreign key) - User who created the pin
      - `created_at` (timestamptz) - Creation timestamp
      
  2. Features
    - Link photos to specific locations on drawings
    - Track progress over time with multiple photos at same location
    - Sequence numbers show chronological order
    - Normalized coordinates (0-1) work with any drawing size
    
  3. Security
    - Enable RLS for authenticated access
    - Users can view pins for accessible drawings
    - Only creators can delete their pins
    
  4. Indexes
    - Index on sheet_id for fast location queries
    - Index on photo_id for reverse lookups
    - Index on coordinates for spatial queries
*/

-- Create drawing photo pins table
CREATE TABLE IF NOT EXISTS drawing_photo_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  x_coordinate decimal NOT NULL CHECK (x_coordinate >= 0 AND x_coordinate <= 1),
  y_coordinate decimal NOT NULL CHECK (y_coordinate >= 0 AND y_coordinate <= 1),
  label text DEFAULT '',
  description text DEFAULT '',
  sequence integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawing_photo_pins_sheet_id ON drawing_photo_pins(sheet_id);
CREATE INDEX IF NOT EXISTS idx_drawing_photo_pins_photo_id ON drawing_photo_pins(photo_id);
CREATE INDEX IF NOT EXISTS idx_drawing_photo_pins_coordinates ON drawing_photo_pins(sheet_id, x_coordinate, y_coordinate);
CREATE INDEX IF NOT EXISTS idx_drawing_photo_pins_sequence ON drawing_photo_pins(sheet_id, sequence);

-- Enable Row Level Security
ALTER TABLE drawing_photo_pins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Drawing Photo Pins

-- Users can view photo pins for accessible drawings
CREATE POLICY "Users can view drawing photo pins"
  ON drawing_photo_pins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drawing_sheets
      WHERE drawing_sheets.id = drawing_photo_pins.sheet_id
    )
  );

-- Authenticated users can create photo pins
CREATE POLICY "Authenticated users can create photo pins"
  ON drawing_photo_pins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own photo pins
CREATE POLICY "Users can update their own photo pins"
  ON drawing_photo_pins FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Users can delete their own photo pins
CREATE POLICY "Users can delete their own photo pins"
  ON drawing_photo_pins FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
