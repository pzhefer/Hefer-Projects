/*
  # Extend Stock System with Stores, Bins, and Enhanced Features

  ## Overview
  Extends the existing stock management system with:
  - Store and bin location management
  - Purchase history tracking
  - Virtual kit functionality
  - Equipment substitution mapping
  - Enhanced specifications and custom fields

  ## New Tables
  1. stock_stores - Store/warehouse locations
  2. stock_bins - Bin locations within stores
  3. stock_purchase_history - Purchase cost tracking over time
  4. stock_kit_components - Virtual kit composition
  5. stock_substitutions - Equipment alternatives mapping
  6. stock_custom_fields - Flexible custom field definitions

  ## Modifications to Existing Tables
  - Add store_id and bin_id to stock_items
  - Add enhanced fields for detailed specifications

  ## Security
  - RLS policies for all new tables
  - Administrator and Stock Manager access
*/

-- Create stock_stores table
CREATE TABLE IF NOT EXISTS stock_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stock_bins table  
CREATE TABLE IF NOT EXISTS stock_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stock_stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint for store_id + code
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_bins_store_code_unique') THEN
    ALTER TABLE stock_bins ADD CONSTRAINT stock_bins_store_code_unique UNIQUE(store_id, code);
  END IF;
END $$;

-- Create stock_purchase_history table
CREATE TABLE IF NOT EXISTS stock_purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  purchase_date date NOT NULL,
  supplier text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  invoice_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create stock_kit_components table
CREATE TABLE IF NOT EXISTS stock_kit_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  component_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  is_optional boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint for kit + component
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_kit_components_kit_component_unique') THEN
    ALTER TABLE stock_kit_components ADD CONSTRAINT stock_kit_components_kit_component_unique UNIQUE(kit_item_id, component_item_id);
  END IF;
END $$;

-- Create stock_substitutions table
CREATE TABLE IF NOT EXISTS stock_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  substitute_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  preference_order integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Add unique constraint for primary + substitute
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_substitutions_primary_substitute_unique') THEN
    ALTER TABLE stock_substitutions ADD CONSTRAINT stock_substitutions_primary_substitute_unique UNIQUE(primary_item_id, substitute_item_id);
  END IF;
END $$;

-- Create stock_custom_fields table
CREATE TABLE IF NOT EXISTS stock_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text UNIQUE NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multiselect')),
  field_options jsonb,
  applies_to_categories uuid[],
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add columns to stock_items if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'store_id') THEN
    ALTER TABLE stock_items ADD COLUMN store_id uuid REFERENCES stock_stores(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'bin_id') THEN
    ALTER TABLE stock_items ADD COLUMN bin_id uuid REFERENCES stock_bins(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'qr_code') THEN
    ALTER TABLE stock_items ADD COLUMN qr_code text UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'dimensions') THEN
    ALTER TABLE stock_items ADD COLUMN dimensions text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'weight') THEN
    ALTER TABLE stock_items ADD COLUMN weight numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'color') THEN
    ALTER TABLE stock_items ADD COLUMN color text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'capacity') THEN
    ALTER TABLE stock_items ADD COLUMN capacity text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'is_kit') THEN
    ALTER TABLE stock_items ADD COLUMN is_kit boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'year') THEN
    ALTER TABLE stock_items ADD COLUMN year integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'custom_fields') THEN
    ALTER TABLE stock_items ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_bins_store ON stock_bins(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_store ON stock_items(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_bin ON stock_items(bin_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchase_history_item ON stock_purchase_history(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchase_history_date ON stock_purchase_history(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_kit_components_kit ON stock_kit_components(kit_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_kit_components_component ON stock_kit_components(component_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_substitutions_primary ON stock_substitutions(primary_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_substitutions_substitute ON stock_substitutions(substitute_item_id);

-- Enable RLS
ALTER TABLE stock_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_kit_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_stores
CREATE POLICY "Authenticated users can view stores"
  ON stock_stores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Stock managers can manage stores"
  ON stock_stores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Administrator', 'Stock Manager')
    )
  );

-- RLS Policies for stock_bins
CREATE POLICY "Authenticated users can view bins"
  ON stock_bins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Stock managers can manage bins"
  ON stock_bins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Administrator', 'Stock Manager')
    )
  );

-- RLS Policies for stock_purchase_history
CREATE POLICY "Authenticated users can view purchase history"
  ON stock_purchase_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Stock managers can manage purchase history"
  ON stock_purchase_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Administrator', 'Stock Manager')
    )
  );

-- RLS Policies for stock_kit_components
CREATE POLICY "Authenticated users can view kit components"
  ON stock_kit_components FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Stock managers can manage kit components"
  ON stock_kit_components FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Administrator', 'Stock Manager')
    )
  );

-- RLS Policies for stock_substitutions
CREATE POLICY "Authenticated users can view substitutions"
  ON stock_substitutions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Stock managers can manage substitutions"
  ON stock_substitutions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Administrator', 'Stock Manager')
    )
  );

-- RLS Policies for stock_custom_fields
CREATE POLICY "Authenticated users can view custom fields"
  ON stock_custom_fields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Stock managers can manage custom fields"
  ON stock_custom_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Administrator', 'Stock Manager')
    )
  );

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_stock_stores_updated_at ON stock_stores;
CREATE TRIGGER update_stock_stores_updated_at
  BEFORE UPDATE ON stock_stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_bins_updated_at ON stock_bins;
CREATE TRIGGER update_stock_bins_updated_at
  BEFORE UPDATE ON stock_bins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();