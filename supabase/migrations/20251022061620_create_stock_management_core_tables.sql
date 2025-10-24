/*
  # Create Stock Management Core Tables

  ## Overview
  Creates the foundation tables for comprehensive stock management including inventory items,
  locations, categories, and core tracking infrastructure.

  ## New Tables Created

  ### `stock_categories`
  Hierarchical categorization system for stock items
  - `id` (uuid, primary key)
  - `name` (text) - Category name
  - `parent_id` (uuid) - For nested categories
  - `description` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `stock_locations`
  Multi-site warehouse and location management
  - `id` (uuid, primary key)
  - `name` (text) - Location name
  - `type` (text) - warehouse, site, vehicle, yard, storage
  - `parent_id` (uuid) - Hierarchical structure
  - `address` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `is_active` (boolean)
  - `capacity` (numeric)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `stock_items`
  Master catalog of all stock items
  - `id` (uuid, primary key)
  - `item_code` (text, unique) - SKU/Asset code
  - `barcode` (text, unique)
  - `name` (text)
  - `description` (text)
  - `category_id` (uuid)
  - `item_type` (text) - serialized, non_serialized, consumable, kit
  - `manufacturer` (text)
  - `model` (text)
  - `serial_number` (text) - For serialized items
  - `specifications` (jsonb) - Flexible specs storage
  - `unit_of_measure` (text)
  - `purchase_cost` (numeric)
  - `replacement_cost` (numeric)
  - `daily_hire_rate` (numeric)
  - `weekly_hire_rate` (numeric)
  - `monthly_hire_rate` (numeric)
  - `minimum_hire_period` (integer) - In hours
  - `reorder_point` (numeric)
  - `reorder_quantity` (numeric)
  - `warranty_expiry` (date)
  - `purchase_date` (date)
  - `image_url` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `stock_quantities`
  Track quantities at each location for non-serialized items
  - `id` (uuid, primary key)
  - `item_id` (uuid)
  - `location_id` (uuid)
  - `quantity_on_hand` (numeric)
  - `quantity_available` (numeric) - On hand minus allocated
  - `quantity_on_order` (numeric)
  - `quantity_allocated` (numeric)
  - `bin_location` (text) - Aisle, rack, shelf
  - `last_counted_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `stock_item_images`
  Multiple images per stock item
  - `id` (uuid, primary key)
  - `item_id` (uuid)
  - `file_path` (text)
  - `is_primary` (boolean)
  - `sort_order` (integer)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated user access
*/

-- Stock Categories Table
CREATE TABLE IF NOT EXISTS stock_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES stock_categories(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stock_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock categories"
  ON stock_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock categories"
  ON stock_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Locations Table
CREATE TABLE IF NOT EXISTS stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'warehouse',
  parent_id uuid REFERENCES stock_locations(id) ON DELETE SET NULL,
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_active boolean DEFAULT true,
  capacity numeric(15, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_location_type CHECK (type IN ('warehouse', 'site', 'vehicle', 'yard', 'storage', 'depot'))
);

ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock locations"
  ON stock_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock locations"
  ON stock_locations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Items Table
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text UNIQUE NOT NULL,
  barcode text UNIQUE,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES stock_categories(id) ON DELETE SET NULL,
  item_type text NOT NULL DEFAULT 'non_serialized',
  manufacturer text,
  model text,
  serial_number text,
  specifications jsonb DEFAULT '{}'::jsonb,
  unit_of_measure text DEFAULT 'ea',
  purchase_cost numeric(15, 2) DEFAULT 0,
  replacement_cost numeric(15, 2) DEFAULT 0,
  daily_hire_rate numeric(15, 2) DEFAULT 0,
  weekly_hire_rate numeric(15, 2) DEFAULT 0,
  monthly_hire_rate numeric(15, 2) DEFAULT 0,
  minimum_hire_period integer DEFAULT 0,
  reorder_point numeric(15, 2) DEFAULT 0,
  reorder_quantity numeric(15, 2) DEFAULT 0,
  warranty_expiry date,
  purchase_date date,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_item_type CHECK (item_type IN ('serialized', 'non_serialized', 'consumable', 'kit'))
);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock items"
  ON stock_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock items"
  ON stock_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Quantities Table
CREATE TABLE IF NOT EXISTS stock_quantities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES stock_locations(id) ON DELETE CASCADE NOT NULL,
  quantity_on_hand numeric(15, 2) DEFAULT 0,
  quantity_available numeric(15, 2) DEFAULT 0,
  quantity_on_order numeric(15, 2) DEFAULT 0,
  quantity_allocated numeric(15, 2) DEFAULT 0,
  bin_location text,
  last_counted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id, location_id)
);

ALTER TABLE stock_quantities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock quantities"
  ON stock_quantities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock quantities"
  ON stock_quantities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Item Images Table
CREATE TABLE IF NOT EXISTS stock_item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  file_path text NOT NULL,
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_item_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock item images"
  ON stock_item_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock item images"
  ON stock_item_images FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_barcode ON stock_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_items_item_type ON stock_items(item_type);
CREATE INDEX IF NOT EXISTS idx_stock_items_is_active ON stock_items(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_quantities_item ON stock_quantities(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_quantities_location ON stock_quantities(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_type ON stock_locations(type);
CREATE INDEX IF NOT EXISTS idx_stock_categories_parent ON stock_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_stock_item_images_item ON stock_item_images(item_id);

-- Function to auto-generate barcode if not provided
CREATE OR REPLACE FUNCTION generate_barcode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.barcode IS NULL THEN
    NEW.barcode := 'BR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_items_barcode_trigger
  BEFORE INSERT ON stock_items
  FOR EACH ROW
  EXECUTE FUNCTION generate_barcode();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_items_updated_at
  BEFORE UPDATE ON stock_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stock_locations_updated_at
  BEFORE UPDATE ON stock_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stock_categories_updated_at
  BEFORE UPDATE ON stock_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stock_quantities_updated_at
  BEFORE UPDATE ON stock_quantities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();