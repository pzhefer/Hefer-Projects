/*
  # Create Maintenance, Invoicing, and Supporting Tables

  ## Overview
  Creates tables for maintenance tracking, job cards, invoicing, purchasing,
  stock takes, and rate management.

  ## New Tables Created

  ### `maintenance_schedules`
  Planned maintenance for equipment
  - `id` (uuid, primary key)
  - `item_id` (uuid)
  - `maintenance_type` (text) - service, inspection, calibration, repair
  - `interval_type` (text) - calendar, hours, cycles
  - `interval_value` (integer)
  - `last_completed_at` (timestamptz)
  - `next_due_at` (timestamptz)
  - `is_active` (boolean)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### `maintenance_records`
  History of maintenance performed
  - `id` (uuid, primary key)
  - `item_id` (uuid)
  - `job_card_number` (text)
  - `maintenance_type` (text)
  - `completed_at` (timestamptz)
  - `completed_by` (uuid)
  - `work_performed` (text)
  - `parts_used` (jsonb)
  - `labor_hours` (numeric)
  - `labor_cost` (numeric)
  - `parts_cost` (numeric)
  - `total_cost` (numeric)
  - `next_service_due` (date)
  - `meter_reading` (numeric)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### `service_meters`
  Usage meter readings for equipment
  - `id` (uuid, primary key)
  - `item_id` (uuid)
  - `meter_type` (text) - hours, kilometers, cycles
  - `reading` (numeric)
  - `reading_date` (timestamptz)
  - `recorded_by` (uuid)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### `inspections`
  Safety and compliance inspections
  - `id` (uuid, primary key)
  - `item_id` (uuid)
  - `inspection_type` (text)
  - `inspection_date` (date)
  - `inspector_name` (text)
  - `result` (text) - pass, fail, conditional
  - `certificate_number` (text)
  - `expiry_date` (date)
  - `findings` (text)
  - `corrective_actions` (text)
  - `performed_by` (uuid)
  - `created_at` (timestamptz)

  ### `suppliers`
  Supplier/vendor management
  - `id` (uuid, primary key)
  - `supplier_code` (text, unique)
  - `name` (text)
  - `contact_name` (text)
  - `email` (text)
  - `phone` (text)
  - `address` (text)
  - `payment_terms` (integer)
  - `lead_time_days` (integer)
  - `is_preferred` (boolean)
  - `is_active` (boolean)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### `purchase_orders`
  Purchase orders for stock
  - `id` (uuid, primary key)
  - `po_number` (text, unique)
  - `supplier_id` (uuid)
  - `order_date` (date)
  - `expected_delivery_date` (date)
  - `status` (text) - draft, submitted, approved, received, cancelled
  - `total_amount` (numeric)
  - `approved_by` (uuid)
  - `notes` (text)
  - `created_by` (uuid)
  - `created_at` (timestamptz)

  ### `purchase_order_items`
  Line items for purchase orders
  - `id` (uuid, primary key)
  - `po_id` (uuid)
  - `item_id` (uuid)
  - `quantity_ordered` (numeric)
  - `quantity_received` (numeric)
  - `unit_price` (numeric)
  - `total_price` (numeric)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### `invoices`
  Customer invoices for hires and sales
  - `id` (uuid, primary key)
  - `invoice_number` (text, unique)
  - `customer_id` (uuid)
  - `invoice_date` (date)
  - `due_date` (date)
  - `status` (text) - draft, sent, paid, overdue, cancelled
  - `subtotal` (numeric)
  - `tax_amount` (numeric)
  - `total_amount` (numeric)
  - `amount_paid` (numeric)
  - `payment_date` (date)
  - `notes` (text)
  - `created_by` (uuid)
  - `created_at` (timestamptz)

  ### `invoice_lines`
  Line items for invoices
  - `id` (uuid, primary key)
  - `invoice_id` (uuid)
  - `hire_booking_id` (uuid)
  - `description` (text)
  - `quantity` (numeric)
  - `unit_price` (numeric)
  - `total_price` (numeric)
  - `line_type` (text) - hire, damage, delivery, other
  - `created_at` (timestamptz)

  ### `stock_takes`
  Physical inventory counts
  - `id` (uuid, primary key)
  - `take_number` (text, unique)
  - `location_id` (uuid)
  - `scheduled_date` (date)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `status` (text) - scheduled, in_progress, completed, cancelled
  - `assigned_to` (uuid)
  - `notes` (text)
  - `created_by` (uuid)
  - `created_at` (timestamptz)

  ### `stock_take_lines`
  Individual count lines
  - `id` (uuid, primary key)
  - `stock_take_id` (uuid)
  - `item_id` (uuid)
  - `expected_quantity` (numeric)
  - `counted_quantity` (numeric)
  - `variance` (numeric)
  - `counted_by` (uuid)
  - `counted_at` (timestamptz)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### `rate_cards`
  Historical rate tracking
  - `id` (uuid, primary key)
  - `item_id` (uuid)
  - `customer_id` (uuid) - NULL for standard rates
  - `project_id` (uuid) - NULL for standard rates
  - `daily_rate` (numeric)
  - `weekly_rate` (numeric)
  - `monthly_rate` (numeric)
  - `effective_from` (date)
  - `effective_to` (date)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated access
*/

-- Maintenance Schedules Table
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  maintenance_type text NOT NULL,
  interval_type text NOT NULL,
  interval_value integer NOT NULL,
  last_completed_at timestamptz,
  next_due_at timestamptz,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_maintenance_type CHECK (maintenance_type IN ('service', 'inspection', 'calibration', 'repair', 'testing')),
  CONSTRAINT valid_interval_type CHECK (interval_type IN ('calendar', 'hours', 'cycles', 'kilometers'))
);

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance schedules"
  ON maintenance_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage maintenance schedules"
  ON maintenance_schedules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Maintenance Records Table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  job_card_number text,
  maintenance_type text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  work_performed text,
  parts_used jsonb DEFAULT '[]'::jsonb,
  labor_hours numeric(10, 2) DEFAULT 0,
  labor_cost numeric(15, 2) DEFAULT 0,
  parts_cost numeric(15, 2) DEFAULT 0,
  total_cost numeric(15, 2) DEFAULT 0,
  next_service_due date,
  meter_reading numeric(15, 2),
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_maintenance_type_record CHECK (maintenance_type IN ('service', 'inspection', 'calibration', 'repair', 'testing'))
);

ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance records"
  ON maintenance_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage maintenance records"
  ON maintenance_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service Meters Table
CREATE TABLE IF NOT EXISTS service_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  meter_type text NOT NULL DEFAULT 'hours',
  reading numeric(15, 2) NOT NULL,
  reading_date timestamptz DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_meter_type CHECK (meter_type IN ('hours', 'kilometers', 'cycles', 'miles'))
);

ALTER TABLE service_meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view service meters"
  ON service_meters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage service meters"
  ON service_meters FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Inspections Table
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  inspection_type text NOT NULL,
  inspection_date date DEFAULT CURRENT_DATE,
  inspector_name text,
  result text NOT NULL,
  certificate_number text,
  expiry_date date,
  findings text,
  corrective_actions text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_inspection_result CHECK (result IN ('pass', 'fail', 'conditional'))
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage inspections"
  ON inspections FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  payment_terms integer DEFAULT 30,
  lead_time_days integer DEFAULT 7,
  is_preferred boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  status text DEFAULT 'draft',
  total_amount numeric(15, 2) DEFAULT 0,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_po_status CHECK (status IN ('draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled'))
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage purchase orders"
  ON purchase_orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  quantity_ordered numeric(15, 2) NOT NULL,
  quantity_received numeric(15, 2) DEFAULT 0,
  unit_price numeric(15, 2) NOT NULL,
  total_price numeric(15, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage purchase order items"
  ON purchase_order_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  invoice_date date DEFAULT CURRENT_DATE,
  due_date date,
  status text DEFAULT 'draft',
  subtotal numeric(15, 2) DEFAULT 0,
  tax_amount numeric(15, 2) DEFAULT 0,
  total_amount numeric(15, 2) DEFAULT 0,
  amount_paid numeric(15, 2) DEFAULT 0,
  payment_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'))
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoice Lines Table
CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  hire_booking_id uuid REFERENCES hire_bookings(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(15, 2) DEFAULT 1,
  unit_price numeric(15, 2) NOT NULL,
  total_price numeric(15, 2) NOT NULL,
  line_type text DEFAULT 'hire',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_line_type CHECK (line_type IN ('hire', 'damage', 'delivery', 'late_fee', 'other'))
);

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice lines"
  ON invoice_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage invoice lines"
  ON invoice_lines FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Takes Table
CREATE TABLE IF NOT EXISTS stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  take_number text UNIQUE NOT NULL,
  location_id uuid REFERENCES stock_locations(id) ON DELETE CASCADE,
  scheduled_date date,
  started_at timestamptz,
  completed_at timestamptz,
  status text DEFAULT 'scheduled',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_stock_take_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock takes"
  ON stock_takes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock takes"
  ON stock_takes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Take Lines Table
CREATE TABLE IF NOT EXISTS stock_take_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id uuid REFERENCES stock_takes(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  expected_quantity numeric(15, 2) DEFAULT 0,
  counted_quantity numeric(15, 2),
  variance numeric(15, 2),
  counted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  counted_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_take_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock take lines"
  ON stock_take_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock take lines"
  ON stock_take_lines FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rate Cards Table
CREATE TABLE IF NOT EXISTS rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  daily_rate numeric(15, 2) DEFAULT 0,
  weekly_rate numeric(15, 2) DEFAULT 0,
  monthly_rate numeric(15, 2) DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rate cards"
  ON rate_cards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage rate cards"
  ON rate_cards FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create all indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_item ON maintenance_schedules(item_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due ON maintenance_schedules(next_due_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_maintenance_records_item ON maintenance_records(item_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON maintenance_records(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_meters_item ON service_meters(item_id);
CREATE INDEX IF NOT EXISTS idx_service_meters_date ON service_meters(reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_item ON inspections(item_id);
CREATE INDEX IF NOT EXISTS idx_inspections_expiry ON inspections(expiry_date);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_location ON stock_takes(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_status ON stock_takes(status);
CREATE INDEX IF NOT EXISTS idx_stock_take_lines_take ON stock_take_lines(stock_take_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_item ON rate_cards(item_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_customer ON rate_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_project ON rate_cards(project_id);

-- Auto-generation functions
CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS stock_take_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.supplier_code IS NULL OR NEW.supplier_code = '' THEN
    NEW.supplier_code := 'SUP-' || LPAD(NEXTVAL('supplier_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suppliers_code_trigger
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION generate_supplier_code();

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('po_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_orders_number_trigger
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_po_number();

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_number_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

CREATE OR REPLACE FUNCTION generate_stock_take_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.take_number IS NULL OR NEW.take_number = '' THEN
    NEW.take_number := 'ST-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('stock_take_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_takes_number_trigger
  BEFORE INSERT ON stock_takes
  FOR EACH ROW
  EXECUTE FUNCTION generate_stock_take_number();

-- Update triggers
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stock_takes_updated_at
  BEFORE UPDATE ON stock_takes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();