/*
  # Make photo title optional and add default value

  1. Changes
    - Make `title` column nullable in `photos` table
    - Add default value for `title` to avoid empty strings
    
  2. Notes
    - This allows photos to be created without requiring a title
    - Default value will be 'Photo' if not provided
*/

ALTER TABLE photos 
ALTER COLUMN title DROP NOT NULL;

ALTER TABLE photos 
ALTER COLUMN title SET DEFAULT 'Photo';
