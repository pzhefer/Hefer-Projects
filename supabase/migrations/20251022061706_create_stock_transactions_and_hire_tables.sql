/*
  # Create Stock Transactions and Hire Management Tables

  ## Overview
  Creates tables for tracking stock movements, hire management (internal and external),
  and customer management.

  ## New Tables Created

  ### `customers`
  External customers for hire/rental operations
  - `id` (uuid, primary key)
  - `customer_code` (text, unique)
  - `company_name` (text)
  - `contact_name` (text)
  - `email` (text)
  - `phone` (text)
  - `address` (text)
  - `customer_type` (text) - retail, trade, corporate
  - `credit_limit` (numeric)
  - `payment_terms` (integer) - Days
  - `discount_percentage` (numeric)
  - `is_active` (boolean)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `stock_transactions`
  Complete ledger of all stock movements
  - `id` (uuid, primary key)
  - `transaction_type` (text) - issue, hire, return, transfer, adjustment, receipt
  - `item_id` (uuid)
  - `from_location_id` (uuid)
  - `to_location_id` (uuid)
  - `quantity` (numeric)
  - `transaction_date` (timestamptz)
  - `reference_number` (text)
  - `project_id` (uuid) - For internal hires
  - `customer_id` (uuid) - For external hires
  - `user_id` (uuid)
  - `notes` (text)
  - `unit_cost` (numeric)
  - `total_cost` (numeric)
  - `created_by` (uuid)
  - `created_at` (timestamptz)

  ### `hire_bookings`
  Reservations and active hires
  - `id` (uuid, primary key)
  - `booking_number` (text, unique)
  - `item_id` (uuid)
  - `booking_type` (text) - internal, external
  - `project_id` (uuid) - For internal hires
  - `customer_id` (uuid) - For external hires
  - `from_location_id` (uuid)
  - `quantity` (numeric)
  - `booking_date` (timestamptz)
  - `required_date` (date)
  - `start_date` (timestamptz)
  - `expected_return_date` (date)
  - `actual_return_date` (timestamptz)
  - `status` (text) - reserved, checked_out, checked_in, cancelled, overdue
  - `daily_rate` (numeric)
  - `weekly_rate` (numeric)
  - `monthly_rate` (numeric)
  - `applied_rate` (numeric)
  - `total_cost` (numeric)
  - `deposit_amount` (numeric)
  - `deposit_paid` (boolean)
  - `checkout_condition` (text)
  - `return_condition` (text)
  - `damage_notes` (text)
  - `damage_cost` (numeric)
  - `checked_out_by` (uuid)
  - `checked_in_by` (uuid)
  - `notes` (text)
  - `created_by` (uuid)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `stock_transfers`
  Inter-location transfers
  - `id` (uuid, primary key)
  - `transfer_number` (text, unique)
  - `from_location_id` (uuid)
  - `to_location_id` (uuid)
  - `transfer_date` (date)
  - `status` (text) - pending, in_transit, received, cancelled
  - `requested_by` (uuid)
  - `approved_by` (uuid)
  - `shipped_by` (uuid)
  - `received_by` (uuid)
  - `shipped_at` (timestamptz)
  - `received_at` (timestamptz)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `stock_transfer_items`
  Line items for transfers
  - `id` (uuid, primary key)
  - `transfer_id` (uuid)
  - `item_id` (uuid)
  - `quantity_requested` (numeric)
  - `quantity_sent` (numeric)
  - `quantity_received` (numeric)
  - `notes` (text)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated access
*/

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE NOT NULL,
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  customer_type text DEFAULT 'retail',
  credit_limit numeric(15, 2) DEFAULT 0,
  payment_terms integer DEFAULT 30,
  discount_percentage numeric(5, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_customer_type CHECK (customer_type IN ('retail', 'trade', 'corporate', 'government'))
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Transactions Table
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL,
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  from_location_id uuid REFERENCES stock_locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES stock_locations(id) ON DELETE SET NULL,
  quantity numeric(15, 2) NOT NULL,
  transaction_date timestamptz DEFAULT now(),
  reference_number text,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  unit_cost numeric(15, 2) DEFAULT 0,
  total_cost numeric(15, 2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('issue', 'hire', 'return', 'transfer', 'adjustment', 'receipt', 'purchase'))
);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock transactions"
  ON stock_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create stock transactions"
  ON stock_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Hire Bookings Table
CREATE TABLE IF NOT EXISTS hire_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text UNIQUE NOT NULL,
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  booking_type text NOT NULL DEFAULT 'internal',
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  from_location_id uuid REFERENCES stock_locations(id) ON DELETE SET NULL,
  quantity numeric(15, 2) DEFAULT 1,
  booking_date timestamptz DEFAULT now(),
  required_date date,
  start_date timestamptz,
  expected_return_date date,
  actual_return_date timestamptz,
  status text DEFAULT 'reserved',
  daily_rate numeric(15, 2) DEFAULT 0,
  weekly_rate numeric(15, 2) DEFAULT 0,
  monthly_rate numeric(15, 2) DEFAULT 0,
  applied_rate numeric(15, 2) DEFAULT 0,
  total_cost numeric(15, 2) DEFAULT 0,
  deposit_amount numeric(15, 2) DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  checkout_condition text,
  return_condition text,
  damage_notes text,
  damage_cost numeric(15, 2) DEFAULT 0,
  checked_out_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_booking_type CHECK (booking_type IN ('internal', 'external')),
  CONSTRAINT valid_status CHECK (status IN ('reserved', 'checked_out', 'checked_in', 'cancelled', 'overdue'))
);

ALTER TABLE hire_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view hire bookings"
  ON hire_bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage hire bookings"
  ON hire_bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Transfers Table
CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text UNIQUE NOT NULL,
  from_location_id uuid REFERENCES stock_locations(id) ON DELETE CASCADE NOT NULL,
  to_location_id uuid REFERENCES stock_locations(id) ON DELETE CASCADE NOT NULL,
  transfer_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending',
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shipped_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shipped_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_transfer_status CHECK (status IN ('pending', 'approved', 'in_transit', 'received', 'cancelled'))
);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock transfers"
  ON stock_transfers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock transfers"
  ON stock_transfers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Transfer Items Table
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES stock_transfers(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  quantity_requested numeric(15, 2) NOT NULL,
  quantity_sent numeric(15, 2) DEFAULT 0,
  quantity_received numeric(15, 2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock transfer items"
  ON stock_transfer_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock transfer items"
  ON stock_transfer_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_item ON stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_project ON stock_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_customer ON stock_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_date ON stock_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_hire_bookings_item ON hire_bookings(item_id);
CREATE INDEX IF NOT EXISTS idx_hire_bookings_status ON hire_bookings(status);
CREATE INDEX IF NOT EXISTS idx_hire_bookings_project ON hire_bookings(project_id);
CREATE INDEX IF NOT EXISTS idx_hire_bookings_customer ON hire_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_hire_bookings_dates ON hire_bookings(start_date, expected_return_date);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_locations ON stock_transfers(from_location_id, to_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON stock_transfer_items(transfer_id);

-- Auto-generate customer code
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := 'CUST-' || LPAD(NEXTVAL('customer_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 1000;

CREATE TRIGGER customers_code_trigger
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_customer_code();

-- Auto-generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := 'HIRE-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('booking_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

CREATE TRIGGER hire_bookings_number_trigger
  BEFORE INSERT ON hire_bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_number();

-- Auto-generate transfer number
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
    NEW.transfer_number := 'TRANS-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('transfer_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 1;

CREATE TRIGGER stock_transfers_number_trigger
  BEFORE INSERT ON stock_transfers
  FOR EACH ROW
  EXECUTE FUNCTION generate_transfer_number();

-- Update triggers
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER hire_bookings_updated_at
  BEFORE UPDATE ON hire_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stock_transfers_updated_at
  BEFORE UPDATE ON stock_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();