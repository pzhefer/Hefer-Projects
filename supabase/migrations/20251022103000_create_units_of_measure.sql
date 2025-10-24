/*
  # Create Units of Measure Management System

  1. New Tables
    - `units_of_measure`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Short code like 'EA', 'KG', 'M'
      - `name` (text) - Full name like 'Each', 'Kilogram', 'Meter'
      - `unit_type` (text) - Category like 'quantity', 'weight', 'length', 'volume', 'area', 'time'
      - `is_active` (boolean) - Whether the unit is active
      - `display_order` (integer) - Order for display in dropdowns
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `units_of_measure` table
    - Add policy for authenticated users to read all units
    - Add policy for users with settings:write permission to manage units

  3. Seed Data
    - Insert commonly used units of measure
*/

-- Create units_of_measure table
CREATE TABLE IF NOT EXISTS units_of_measure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('quantity', 'weight', 'length', 'volume', 'area', 'time', 'other')),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read units
CREATE POLICY "Authenticated users can view units of measure"
  ON units_of_measure
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users with settings:write permission to insert units
CREATE POLICY "Users with settings:write can create units of measure"
  ON units_of_measure
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN user_roles ur ON up.user_id = ur.user_id
      WHERE up.user_id = auth.uid()
      AND up.module = 'settings'
      AND up.can_write = true
    )
  );

-- Allow users with settings:write permission to update units
CREATE POLICY "Users with settings:write can update units of measure"
  ON units_of_measure
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN user_roles ur ON up.user_id = ur.user_id
      WHERE up.user_id = auth.uid()
      AND up.module = 'settings'
      AND up.can_write = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN user_roles ur ON up.user_id = ur.user_id
      WHERE up.user_id = auth.uid()
      AND up.module = 'settings'
      AND up.can_write = true
    )
  );

-- Allow users with settings:delete permission to delete units
CREATE POLICY "Users with settings:delete can delete units of measure"
  ON units_of_measure
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN user_roles ur ON up.user_id = ur.user_id
      WHERE up.user_id = auth.uid()
      AND up.module = 'settings'
      AND up.can_delete = true
    )
  );

-- Insert commonly used units of measure
INSERT INTO units_of_measure (code, name, unit_type, display_order) VALUES
  -- Quantity
  ('EA', 'Each', 'quantity', 10),
  ('PR', 'Pair', 'quantity', 20),
  ('SET', 'Set', 'quantity', 30),
  ('PC', 'Piece', 'quantity', 40),
  ('BOX', 'Box', 'quantity', 50),
  ('PKG', 'Package', 'quantity', 60),
  ('CTN', 'Carton', 'quantity', 70),
  ('ROLL', 'Roll', 'quantity', 80),
  ('SHEET', 'Sheet', 'quantity', 90),
  ('UNIT', 'Unit', 'quantity', 100),

  -- Weight
  ('G', 'Gram', 'weight', 110),
  ('KG', 'Kilogram', 'weight', 120),
  ('T', 'Tonne', 'weight', 130),
  ('LB', 'Pound', 'weight', 140),
  ('OZ', 'Ounce', 'weight', 150),

  -- Length
  ('MM', 'Millimeter', 'length', 160),
  ('CM', 'Centimeter', 'length', 170),
  ('M', 'Meter', 'length', 180),
  ('KM', 'Kilometer', 'length', 190),
  ('IN', 'Inch', 'length', 200),
  ('FT', 'Foot', 'length', 210),
  ('YD', 'Yard', 'length', 220),

  -- Volume
  ('ML', 'Milliliter', 'volume', 230),
  ('L', 'Liter', 'volume', 240),
  ('GAL', 'Gallon', 'volume', 250),
  ('M3', 'Cubic Meter', 'volume', 260),
  ('FT3', 'Cubic Foot', 'volume', 270),

  -- Area
  ('M2', 'Square Meter', 'area', 280),
  ('FT2', 'Square Foot', 'area', 290),
  ('HA', 'Hectare', 'area', 300),

  -- Time
  ('HR', 'Hour', 'time', 310),
  ('DAY', 'Day', 'time', 320),
  ('WK', 'Week', 'time', 330),
  ('MO', 'Month', 'time', 340)
ON CONFLICT (code) DO NOTHING;
