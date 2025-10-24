/*
  # Fix Stock Item Images Schema
  
  1. Changes
    - Rename `sort_order` to `display_order` for consistency
    - Add missing columns: `file_name`, `file_size`, `mime_type`, `caption`, `uploaded_by`, `updated_at`
    - Ensure all columns match the application code expectations
  
  2. Notes
    - This fixes the "display_order column not found" error
    - Adds metadata columns that were missing from the original table
*/

-- Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_item_images' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE stock_item_images ADD COLUMN file_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_item_images' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE stock_item_images ADD COLUMN file_size bigint NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_item_images' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE stock_item_images ADD COLUMN mime_type text NOT NULL DEFAULT 'image/jpeg';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_item_images' AND column_name = 'caption'
  ) THEN
    ALTER TABLE stock_item_images ADD COLUMN caption text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_item_images' AND column_name = 'uploaded_by'
  ) THEN
    ALTER TABLE stock_item_images ADD COLUMN uploaded_by uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_item_images' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stock_item_images ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Rename sort_order to display_order
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_item_images' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE stock_item_images RENAME COLUMN sort_order TO display_order;
  END IF;
END $$;

-- Ensure display_order has a default if it doesn't already
ALTER TABLE stock_item_images ALTER COLUMN display_order SET DEFAULT 0;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_stock_item_images_item_id ON stock_item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_item_images_is_primary ON stock_item_images(is_primary);
