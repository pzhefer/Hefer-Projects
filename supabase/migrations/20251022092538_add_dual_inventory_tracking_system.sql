/*
  # Add Dual Inventory Tracking System

  ## Overview
  Implements dual inventory tracking to support both:
  1. **Serialized items**: Individual assets tracked by unique serial numbers
  2. **Non-serialized items**: Bulk quantity tracking with quantity counts

  ## Changes Made

  ### 1. New Table: `stock_serialized_items`
  Tracks individual serialized items with unique identifiers
  - `id` (uuid, primary key) - Unique identifier for this serialized instance
  - `item_id` (uuid) - Links to parent item in stock_items
  - `serial_number` (text, unique, required) - Unique serial/asset number
  - `location_id` (uuid) - Current location of this specific item
  - `condition` (text) - excellent, good, fair, poor, damaged
  - `status` (text) - available, in_use, on_hire, maintenance, retired
  - `purchase_date` (date) - When this specific unit was purchased
  - `purchase_cost` (numeric) - Cost of this specific unit
  - `warranty_expiry` (date) - Warranty expiration for this unit
  - `last_service_date` (date) - Last maintenance/service date
  - `next_service_date` (date) - Next scheduled service
  - `notes` (text) - Item-specific notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. Modified: `stock_items` table
  Enhanced to better support dual tracking mode
  - Added `is_serialized` (boolean) - Determines tracking method
  - `serial_number` field now acts as a template/example for serialized items
  - For serialized items: master catalog entry
  - For non-serialized items: standard bulk inventory entry

  ### 3. Business Logic
  - **Serialized items** (`is_serialized = true`):
    - Each physical unit tracked in `stock_serialized_items` table
    - Quantity = COUNT of records in `stock_serialized_items`
    - Individual tracking with serial numbers, condition, status
  - **Non-serialized items** (`is_serialized = false`):
    - Tracked using `stock_quantities` table
    - Aggregate quantity tracking by location
    - No individual unit tracking

  ## Security
  - Enable RLS on `stock_serialized_items` table
  - Add policies for authenticated user access
  - Ensure data integrity with constraints

  ## Important Notes
  1. Existing items default to `is_serialized = false` (non-serialized)
  2. Item type 'serialized' should set `is_serialized = true`
  3. Cannot change `is_serialized` once transactions exist
  4. Serial numbers must be unique across all serialized items
*/

-- Add is_serialized flag to stock_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_items' AND column_name = 'is_serialized'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN is_serialized boolean DEFAULT false;
  END IF;
END $$;

-- Update existing serialized item types to use is_serialized flag
UPDATE stock_items SET is_serialized = true WHERE item_type = 'serialized';

-- Create index on is_serialized for performance
CREATE INDEX IF NOT EXISTS idx_stock_items_is_serialized ON stock_items(is_serialized);

-- Create stock_serialized_items table for individual asset tracking
CREATE TABLE IF NOT EXISTS stock_serialized_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  serial_number text UNIQUE NOT NULL,
  location_id uuid REFERENCES stock_locations(id) ON DELETE SET NULL,
  condition text DEFAULT 'good',
  status text DEFAULT 'available',
  purchase_date date,
  purchase_cost numeric(15, 2) DEFAULT 0,
  warranty_expiry date,
  last_service_date date,
  next_service_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_condition CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  CONSTRAINT valid_status CHECK (status IN ('available', 'in_use', 'on_hire', 'maintenance', 'retired', 'disposed'))
);

-- Enable RLS on stock_serialized_items
ALTER TABLE stock_serialized_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view serialized items"
  ON stock_serialized_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert serialized items"
  ON stock_serialized_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update serialized items"
  ON stock_serialized_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete serialized items"
  ON stock_serialized_items FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_serialized_items_item ON stock_serialized_items(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_serialized_items_location ON stock_serialized_items(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_serialized_items_serial ON stock_serialized_items(serial_number);
CREATE INDEX IF NOT EXISTS idx_stock_serialized_items_status ON stock_serialized_items(status);
CREATE INDEX IF NOT EXISTS idx_stock_serialized_items_condition ON stock_serialized_items(condition);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER stock_serialized_items_updated_at
  BEFORE UPDATE ON stock_serialized_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for easy quantity calculation across both tracking methods
CREATE OR REPLACE VIEW stock_item_quantities AS
SELECT 
  si.id as item_id,
  si.item_code,
  si.name,
  si.is_serialized,
  si.item_type,
  CASE 
    WHEN si.is_serialized THEN COUNT(DISTINCT ssi.id)::numeric
    ELSE COALESCE(SUM(sq.quantity_on_hand), 0)
  END as total_quantity,
  CASE 
    WHEN si.is_serialized THEN COUNT(DISTINCT CASE WHEN ssi.status = 'available' THEN ssi.id END)::numeric
    ELSE COALESCE(SUM(sq.quantity_available), 0)
  END as available_quantity,
  CASE 
    WHEN si.is_serialized THEN COUNT(DISTINCT CASE WHEN ssi.status IN ('on_hire', 'in_use') THEN ssi.id END)::numeric
    ELSE COALESCE(SUM(sq.quantity_allocated), 0)
  END as allocated_quantity
FROM stock_items si
LEFT JOIN stock_serialized_items ssi ON si.id = ssi.item_id AND si.is_serialized = true
LEFT JOIN stock_quantities sq ON si.id = sq.item_id AND si.is_serialized = false
GROUP BY si.id, si.item_code, si.name, si.is_serialized, si.item_type;

-- Function to validate serialized item creation
CREATE OR REPLACE FUNCTION validate_serialized_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the parent item is marked as serialized
  IF NOT EXISTS (
    SELECT 1 FROM stock_items 
    WHERE id = NEW.item_id AND is_serialized = true
  ) THEN
    RAISE EXCEPTION 'Cannot add serialized item to non-serialized stock item';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_serialized_item_trigger
  BEFORE INSERT OR UPDATE ON stock_serialized_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_serialized_item();
