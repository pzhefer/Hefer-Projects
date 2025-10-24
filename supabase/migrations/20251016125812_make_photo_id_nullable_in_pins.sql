/*
  # Make photo_id nullable in drawing_photo_pins

  ## Changes
  - Allow photo_id to be NULL in drawing_photo_pins table
  - This enables creating photo pins as location markers without immediately attaching photos
  - Photos can be added later to the pin location
  
  ## Rationale
  - Users may want to mark locations on drawings before photos are available
  - Allows for better workflow when planning photo documentation
  - Pin serves as a placeholder for future progress tracking
*/

-- Make photo_id nullable to allow pins without photos
ALTER TABLE drawing_photo_pins 
ALTER COLUMN photo_id DROP NOT NULL;

-- Update the foreign key constraint to handle nulls properly
ALTER TABLE drawing_photo_pins 
DROP CONSTRAINT IF EXISTS drawing_photo_pins_photo_id_fkey;

ALTER TABLE drawing_photo_pins
ADD CONSTRAINT drawing_photo_pins_photo_id_fkey 
FOREIGN KEY (photo_id) 
REFERENCES photos(id) 
ON DELETE CASCADE;