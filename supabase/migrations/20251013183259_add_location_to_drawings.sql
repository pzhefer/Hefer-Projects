/*
  # Add Location Support to Drawings

  ## Overview
  This migration adds location tracking to the drawings table, allowing drawings to be associated
  with specific project locations (buildings, floors, rooms, etc.).

  ## Changes
  
  ### Table Modifications
  - Add `location_id` column to `drawings` table
    - Type: uuid, nullable
    - References: project_locations(id)
    - Allows drawings to be associated with specific project locations
    - Cascade delete: If a location is deleted, location_id is set to NULL

  ## Important Notes
  1. Location is optional - drawings can exist without a location
  2. Location must belong to the same project as the drawing (enforced at application level)
  3. Deleting a location does NOT delete the drawings, just removes the association
*/

-- Add location_id column to drawings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawings' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE drawings ADD COLUMN location_id uuid REFERENCES project_locations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_drawings_location_id ON drawings(location_id);
  END IF;
END $$;
