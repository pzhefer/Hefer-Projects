/*
  # Add Location Support to Photos

  ## Overview
  This migration adds location tracking to the photos table, allowing photos to be associated
  with specific project locations (buildings, floors, rooms, etc.).

  ## Changes
  
  ### Table Modifications
  - Add `location_id` column to `photos` table
    - Type: uuid, nullable
    - References: project_locations(id)
    - Allows photos to be associated with specific project locations
    - Cascade delete: If a location is deleted, location_id is set to NULL

  ## Important Notes
  1. Location is optional - photos can exist without a location
  2. Location must belong to the same project as the photo (enforced at application level)
  3. Deleting a location does NOT delete the photos, just removes the association
*/

-- Add location_id column to photos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE photos ADD COLUMN location_id uuid REFERENCES project_locations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_photos_location_id ON photos(location_id);
  END IF;
END $$;
