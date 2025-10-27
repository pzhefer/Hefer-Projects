/*
  # Add Scale to Drawing Versions

  1. Changes
    - Add `scale` column to `drawing_versions` table to store calibration scale
    - Add `scale_unit` column to store the unit of measurement (mm, cm, m, etc.)
    - Default unit is 'mm'

  2. Purpose
    - Persist calibration scale across drawing sessions
    - Allow scale to be saved and retrieved when opening a drawing version
*/

ALTER TABLE drawing_versions
ADD COLUMN IF NOT EXISTS scale double precision,
ADD COLUMN IF NOT EXISTS scale_unit text DEFAULT 'mm';