import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  });
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Project = {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  health: 'good' | 'at_risk' | 'poor';
  start_date: string;
  target_end_date: string;
  actual_end_date: string | null;
  progress: number;
  budget: number;
  spent: number;
  location: string;
  client_name: string;
  project_manager: string;
  team_size: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  project_type: 'commercial' | 'residential' | 'industrial' | 'infrastructure' | 'other';
  created_at: string;
  updated_at: string;
};

export type ProjectMilestone = {
  id: string;
  project_id: string;
  name: string;
  description: string;
  target_date: string;
  actual_date: string | null;
  status: 'upcoming' | 'in_progress' | 'completed' | 'at_risk';
  created_at: string;
  updated_at: string;
};

export type Drawing = {
  id: string;
  project_id: string;
  drawing_number: string;
  title: string;
  discipline: string;
  revision: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: 'draft' | 'for_review' | 'approved' | 'superseded';
  uploaded_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type DrawingRevision = {
  id: string;
  drawing_id: string;
  revision: string;
  file_url: string;
  file_name: string;
  changes_description: string;
  uploaded_by: string | null;
  created_at: string;
};

export type DrawingSet = {
  id: string;
  project_id: string;
  name: string;
  description: string;
  discipline: string | null;
  parent_set_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type DrawingSheet = {
  id: string;
  set_id: string | null;
  project_id: string;
  sheet_number: string;
  sheet_name: string;
  discipline: string;
  current_version_id: string | null;
  status: 'draft' | 'for_review' | 'approved' | 'superseded' | 'as_built';
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type DrawingVersion = {
  id: string;
  sheet_id: string;
  version_number: string;
  version_date: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  thumbnail_url: string | null;
  changes_description: string;
  uploaded_by: string | null;
  is_current: boolean;
  created_at: string;
  scale: number | null;
  scale_unit: string | null;
};

export type DrawingHyperlink = {
  id: string;
  source_sheet_id: string;
  target_sheet_id: string;
  link_text: string | null;
  x_coordinate: number | null;
  y_coordinate: number | null;
  created_at: string;
};

export type DrawingMarkup = {
  id: string;
  sheet_id: string;
  version_id: string | null;
  markup_type: 'pen' | 'highlighter' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'cloud' | 'text' | 'photo' | 'measurement';
  data: any;
  color: string;
  stroke_width: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DrawingTag = {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type DrawingIssue = {
  id: string;
  sheet_id: string;
  title: string;
  description: string;
  issue_type: 'rfi' | 'snag' | 'observation' | 'change' | 'clash' | 'general';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  x_coordinate: number;
  y_coordinate: number;
  assigned_to: string | null;
  created_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type StockCategory = {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type StockLocation = {
  id: string;
  name: string;
  type: 'warehouse' | 'site' | 'vehicle' | 'yard' | 'storage' | 'depot';
  parent_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  capacity: number | null;
  created_at: string;
  updated_at: string;
};

export type StockItem = {
  id: string;
  item_code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: string | null;
  item_type: 'serialized' | 'non_serialized';
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  specifications: any;
  unit_of_measure: string;
  capacity: number | null;
  purchase_cost: number;
  replacement_cost: number;
  daily_hire_rate: number;
  weekly_hire_rate: number;
  monthly_hire_rate: number;
  minimum_hire_period: number;
  reorder_point: number;
  reorder_quantity: number;
  warranty_expiry: string | null;
  purchase_date: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StockQuantity = {
  id: string;
  item_id: string;
  location_id: string;
  quantity_on_hand: number;
  quantity_available: number;
  quantity_on_order: number;
  quantity_allocated: number;
  bin_location: string | null;
  last_counted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  customer_code: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  customer_type: 'retail' | 'trade' | 'corporate' | 'government';
  credit_limit: number;
  payment_terms: number;
  discount_percentage: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StockTransaction = {
  id: string;
  transaction_type: 'issue' | 'hire' | 'return' | 'transfer' | 'adjustment' | 'receipt' | 'purchase';
  item_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  transaction_date: string;
  reference_number: string | null;
  project_id: string | null;
  customer_id: string | null;
  user_id: string | null;
  notes: string | null;
  unit_cost: number;
  total_cost: number;
  created_by: string | null;
  created_at: string;
};

export type HireBooking = {
  id: string;
  booking_number: string;
  item_id: string;
  booking_type: 'internal' | 'external';
  project_id: string | null;
  customer_id: string | null;
  from_location_id: string | null;
  quantity: number;
  booking_date: string;
  required_date: string | null;
  start_date: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: 'reserved' | 'checked_out' | 'checked_in' | 'cancelled' | 'overdue';
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  applied_rate: number;
  total_cost: number;
  deposit_amount: number;
  deposit_paid: boolean;
  checkout_condition: string | null;
  return_condition: string | null;
  damage_notes: string | null;
  damage_cost: number;
  checked_out_by: string | null;
  checked_in_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StockTransfer = {
  id: string;
  transfer_number: string;
  from_location_id: string;
  to_location_id: string;
  transfer_date: string;
  status: 'pending' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  requested_by: string | null;
  approved_by: string | null;
  shipped_by: string | null;
  received_by: string | null;
  shipped_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceRecord = {
  id: string;
  item_id: string;
  job_card_number: string | null;
  maintenance_type: 'service' | 'inspection' | 'calibration' | 'repair' | 'testing';
  completed_at: string;
  completed_by: string | null;
  work_performed: string | null;
  parts_used: any;
  labor_hours: number;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  next_service_due: string | null;
  meter_reading: number | null;
  notes: string | null;
  created_at: string;
};

export type Inspection = {
  id: string;
  item_id: string;
  inspection_type: string;
  inspection_date: string;
  inspector_name: string | null;
  result: 'pass' | 'fail' | 'conditional';
  certificate_number: string | null;
  expiry_date: string | null;
  findings: string | null;
  corrective_actions: string | null;
  performed_by: string | null;
  created_at: string;
};

export type Supplier = {
  id: string;
  supplier_code: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: number;
  lead_time_days: number;
  is_preferred: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'partially_received' | 'received' | 'cancelled';
  total_amount: number;
  approved_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  invoice_date: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  payment_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StockTake = {
  id: string;
  take_number: string;
  location_id: string | null;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
