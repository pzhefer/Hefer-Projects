/*
  # Add Capacity field to stock_items

  1. Changes
    - Add capacity column to stock_items table
    - Capacity stores the quantity/volume capacity of the item
    - Used for items that contain or hold other items

  2. Notes
    - Field is optional (nullable)
    - Useful for containers, bins, vehicles, etc.
*/

-- Add capacity column to stock_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_items' AND column_name = 'capacity'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN capacity numeric(15,3);
  END IF;
END $$;
