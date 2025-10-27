/*
  # Add Barcode and QR Code Fields to Stock Items

  1. Changes
    - Add `barcode` column to store barcode value (CODE128, EAN13, etc.)
    - Add `barcode_format` column to specify barcode format
    - Add `qr_code` column to store QR code content
    - Add `sku` column for Stock Keeping Unit
    - Add unique constraint on barcode and sku fields

  2. Notes
    - Barcodes are automatically generated when items are created
    - QR codes contain item metadata for quick scanning
    - SKUs are unique identifiers for inventory management
*/

-- Add barcode and QR code fields to stock_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_items' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN barcode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_items' AND column_name = 'barcode_format'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN barcode_format text DEFAULT 'CODE128';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_items' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN qr_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_items' AND column_name = 'sku'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN sku text;
  END IF;
END $$;

-- Add unique constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_items_barcode_unique'
  ) THEN
    ALTER TABLE stock_items ADD CONSTRAINT stock_items_barcode_unique UNIQUE (barcode);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_items_sku_unique'
  ) THEN
    ALTER TABLE stock_items ADD CONSTRAINT stock_items_sku_unique UNIQUE (sku);
  END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_items_barcode ON stock_items(barcode);
CREATE INDEX IF NOT EXISTS idx_stock_items_sku ON stock_items(sku);
