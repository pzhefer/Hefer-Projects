/*
  # Revert item_type to serialized/non-serialized tracking

  1. Changes
    - Drop current constraint
    - Update existing data back to serialized/non_serialized values:
      - 'asset' → 'serialized'
      - 'inventory' → 'non_serialized'
      - 'tool' → 'non_serialized'
      - 'consumable' → 'non_serialized'
    - Add constraint allowing: 'serialized', 'non_serialized'

  2. Notes
    - Item types now purely indicate tracking method
    - Serialized: Track individual units by serial number
    - Non-Serialized: Track by bulk quantity
    - No classification categories needed
*/

-- Drop the current constraint
ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS valid_item_type;

-- Update existing data back to tracking-based values
UPDATE stock_items SET item_type = 'serialized' WHERE item_type = 'asset';
UPDATE stock_items SET item_type = 'non_serialized' WHERE item_type IN ('inventory', 'tool', 'consumable');

-- Add constraint with tracking-based values
ALTER TABLE stock_items ADD CONSTRAINT valid_item_type
  CHECK (item_type IN ('serialized', 'non_serialized'));
