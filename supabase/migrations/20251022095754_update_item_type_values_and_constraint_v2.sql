/*
  # Update item_type values and constraint to match UI

  1. Changes
    - Drop old constraint first to allow updates
    - Map existing item_type values to new user-friendly names:
      - 'serialized' → 'asset' (serialized items become assets)
      - 'non_serialized' → 'inventory' (bulk items become inventory)
      - 'consumable' → 'consumable' (stays the same)
      - 'kit' → 'tool' (kits become tools)
    - Add new constraint allowing: 'inventory', 'asset', 'tool', 'consumable'
  
  2. Notes
    - Inventory: General stock items tracked by quantity
    - Asset: Fixed assets like equipment (serialized tracking)
    - Tool: Tools, equipment, and kits for hire/use
    - Consumable: Single-use items
    - The is_serialized and is_kit flags will still control detailed behavior
*/

-- Drop the old constraint first
ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS valid_item_type;

-- Update existing data to new values
UPDATE stock_items SET item_type = 'asset' WHERE item_type = 'serialized';
UPDATE stock_items SET item_type = 'inventory' WHERE item_type = 'non_serialized';
UPDATE stock_items SET item_type = 'tool' WHERE item_type = 'kit';
-- consumable stays the same

-- Add new constraint with UI-aligned values
ALTER TABLE stock_items ADD CONSTRAINT valid_item_type 
  CHECK (item_type IN ('inventory', 'asset', 'tool', 'consumable'));
