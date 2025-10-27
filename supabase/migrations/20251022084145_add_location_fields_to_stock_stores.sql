/*
  # Add Location Fields to Stock Stores

  ## Overview
  Adds comprehensive location tracking to the stock_stores table to support
  the new global location system with countries, states, and cities.

  ## Changes
  
  ### Modified Tables
  
  #### `stock_stores`
  - `location` (text) - Location description (e.g., "Building A, Floor 2")
  - `address` (text) - Street address
  - `city` (uuid) - Reference to global_cities
  - `state` (uuid) - Reference to global_states
  - `postal_code` (text) - Postal/ZIP code
  - `country` (uuid) - Reference to global_countries
  
  ## Notes
  - All location fields are optional to maintain flexibility
  - Foreign keys reference the global location master data tables
  - Existing stores will have NULL values for these new fields
*/

-- Add location fields to stock_stores table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_stores' AND column_name = 'location'
  ) THEN
    ALTER TABLE stock_stores ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_stores' AND column_name = 'address'
  ) THEN
    ALTER TABLE stock_stores ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_stores' AND column_name = 'city'
  ) THEN
    ALTER TABLE stock_stores ADD COLUMN city uuid REFERENCES global_cities(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_stores' AND column_name = 'state'
  ) THEN
    ALTER TABLE stock_stores ADD COLUMN state uuid REFERENCES global_states(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_stores' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE stock_stores ADD COLUMN postal_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_stores' AND column_name = 'country'
  ) THEN
    ALTER TABLE stock_stores ADD COLUMN country uuid REFERENCES global_countries(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_stock_stores_city ON stock_stores(city);
CREATE INDEX IF NOT EXISTS idx_stock_stores_state ON stock_stores(state);
CREATE INDEX IF NOT EXISTS idx_stock_stores_country ON stock_stores(country);