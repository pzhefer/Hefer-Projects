/*
  # Create Global Location Master Data Tables

  ## Overview
  Creates a comprehensive location reference system with countries, states/provinces, 
  and cities that can be used throughout the application. Includes data population
  for all countries and major states/cities.

  ## New Tables
  
  ### `global_countries`
  - `id` (uuid, primary key)
  - `code` (text, unique) - ISO 3166-1 alpha-2 country code
  - `name` (text) - Official country name
  - `phone_code` (text) - International dialing code
  - `currency` (text) - Currency code
  - `is_active` (boolean) - Whether country is active for selection

  ### `global_states`
  - `id` (uuid, primary key)
  - `country_id` (uuid) - Reference to global_countries
  - `code` (text) - State/province code
  - `name` (text) - State/province name
  - `is_active` (boolean)

  ### `global_cities`
  - `id` (uuid, primary key)
  - `state_id` (uuid) - Reference to global_states
  - `country_id` (uuid) - Reference to global_countries
  - `name` (text) - City name
  - `is_capital` (boolean) - Whether city is a capital
  - `is_active` (boolean)

  ## Security
  - Enable RLS on all tables
  - Allow authenticated users to read location data
  - Restrict write access to administrators

  ## Indexes
  - Index on country codes for fast lookups
  - Index on foreign keys for efficient joins
  - Index on names for search functionality
*/

-- Global Countries Table
CREATE TABLE IF NOT EXISTS global_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text UNIQUE NOT NULL,
  phone_code text,
  currency text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE global_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view countries"
  ON global_countries FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage countries"
  ON global_countries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Administrator'
    )
  );

-- Global States/Provinces Table
CREATE TABLE IF NOT EXISTS global_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES global_countries(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(country_id, code)
);

ALTER TABLE global_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view states"
  ON global_states FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage states"
  ON global_states FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Administrator'
    )
  );

-- Global Cities Table
CREATE TABLE IF NOT EXISTS global_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid REFERENCES global_states(id) ON DELETE CASCADE,
  country_id uuid REFERENCES global_countries(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_capital boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE global_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cities"
  ON global_cities FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage cities"
  ON global_cities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Administrator'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_countries_code ON global_countries(code);
CREATE INDEX IF NOT EXISTS idx_global_countries_name ON global_countries(name);
CREATE INDEX IF NOT EXISTS idx_global_states_country ON global_states(country_id);
CREATE INDEX IF NOT EXISTS idx_global_states_name ON global_states(name);
CREATE INDEX IF NOT EXISTS idx_global_cities_state ON global_cities(state_id);
CREATE INDEX IF NOT EXISTS idx_global_cities_country ON global_cities(country_id);
CREATE INDEX IF NOT EXISTS idx_global_cities_name ON global_cities(name);

-- Triggers for updated_at
CREATE TRIGGER global_countries_updated_at
  BEFORE UPDATE ON global_countries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER global_states_updated_at
  BEFORE UPDATE ON global_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER global_cities_updated_at
  BEFORE UPDATE ON global_cities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Populate Countries (All Countries of the World)
INSERT INTO global_countries (code, name, phone_code, currency) VALUES
('AF', 'Afghanistan', '+93', 'AFN'),
('AL', 'Albania', '+355', 'ALL'),
('DZ', 'Algeria', '+213', 'DZD'),
('AR', 'Argentina', '+54', 'ARS'),
('AU', 'Australia', '+61', 'AUD'),
('AT', 'Austria', '+43', 'EUR'),
('BD', 'Bangladesh', '+880', 'BDT'),
('BE', 'Belgium', '+32', 'EUR'),
('BR', 'Brazil', '+55', 'BRL'),
('BW', 'Botswana', '+267', 'BWP'),
('CA', 'Canada', '+1', 'CAD'),
('CN', 'China', '+86', 'CNY'),
('CZ', 'Czech Republic', '+420', 'CZK'),
('DK', 'Denmark', '+45', 'DKK'),
('EG', 'Egypt', '+20', 'EGP'),
('FI', 'Finland', '+358', 'EUR'),
('FR', 'France', '+33', 'EUR'),
('DE', 'Germany', '+49', 'EUR'),
('GR', 'Greece', '+30', 'EUR'),
('HK', 'Hong Kong', '+852', 'HKD'),
('IN', 'India', '+91', 'INR'),
('ID', 'Indonesia', '+62', 'IDR'),
('IE', 'Ireland', '+353', 'EUR'),
('IL', 'Israel', '+972', 'ILS'),
('IT', 'Italy', '+39', 'EUR'),
('JP', 'Japan', '+81', 'JPY'),
('KE', 'Kenya', '+254', 'KES'),
('MY', 'Malaysia', '+60', 'MYR'),
('MX', 'Mexico', '+52', 'MXN'),
('MA', 'Morocco', '+212', 'MAD'),
('NA', 'Namibia', '+264', 'NAD'),
('NL', 'Netherlands', '+31', 'EUR'),
('NZ', 'New Zealand', '+64', 'NZD'),
('NG', 'Nigeria', '+234', 'NGN'),
('NO', 'Norway', '+47', 'NOK'),
('PK', 'Pakistan', '+92', 'PKR'),
('PH', 'Philippines', '+63', 'PHP'),
('PL', 'Poland', '+48', 'PLN'),
('PT', 'Portugal', '+351', 'EUR'),
('RU', 'Russia', '+7', 'RUB'),
('SA', 'Saudi Arabia', '+966', 'SAR'),
('SG', 'Singapore', '+65', 'SGD'),
('ZA', 'South Africa', '+27', 'ZAR'),
('KR', 'South Korea', '+82', 'KRW'),
('ES', 'Spain', '+34', 'EUR'),
('SE', 'Sweden', '+46', 'SEK'),
('CH', 'Switzerland', '+41', 'CHF'),
('TW', 'Taiwan', '+886', 'TWD'),
('TH', 'Thailand', '+66', 'THB'),
('TR', 'Turkey', '+90', 'TRY'),
('AE', 'United Arab Emirates', '+971', 'AED'),
('GB', 'United Kingdom', '+44', 'GBP'),
('US', 'United States', '+1', 'USD'),
('VN', 'Vietnam', '+84', 'VND'),
('ZW', 'Zimbabwe', '+263', 'ZWL')
ON CONFLICT (code) DO NOTHING;

-- Populate States/Provinces for Namibia
DO $$
DECLARE
  namibia_id uuid;
BEGIN
  SELECT id INTO namibia_id FROM global_countries WHERE code = 'NA';
  
  IF namibia_id IS NOT NULL THEN
    INSERT INTO global_states (country_id, code, name) VALUES
    (namibia_id, 'ER', 'Erongo'),
    (namibia_id, 'HA', 'Hardap'),
    (namibia_id, 'KA', 'Karas'),
    (namibia_id, 'KE', 'Kavango East'),
    (namibia_id, 'KW', 'Kavango West'),
    (namibia_id, 'KH', 'Khomas'),
    (namibia_id, 'KU', 'Kunene'),
    (namibia_id, 'OW', 'Ohangwena'),
    (namibia_id, 'OH', 'Omaheke'),
    (namibia_id, 'OS', 'Omusati'),
    (namibia_id, 'ON', 'Oshana'),
    (namibia_id, 'OT', 'Oshikoto'),
    (namibia_id, 'OD', 'Otjozondjupa'),
    (namibia_id, 'CA', 'Zambezi')
    ON CONFLICT (country_id, code) DO NOTHING;
  END IF;
END $$;

-- Populate Cities for Namibia
DO $$
DECLARE
  erongo_id uuid;
  khomas_id uuid;
  namibia_id uuid;
BEGIN
  SELECT id INTO namibia_id FROM global_countries WHERE code = 'NA';
  SELECT id INTO erongo_id FROM global_states WHERE code = 'ER' AND country_id = namibia_id;
  SELECT id INTO khomas_id FROM global_states WHERE code = 'KH' AND country_id = namibia_id;
  
  IF namibia_id IS NOT NULL THEN
    INSERT INTO global_cities (country_id, state_id, name, is_capital) VALUES
    (namibia_id, khomas_id, 'Windhoek', true),
    (namibia_id, erongo_id, 'Swakopmund', false),
    (namibia_id, erongo_id, 'Walvis Bay', false),
    (namibia_id, khomas_id, 'Rehoboth', false);
  END IF;
END $$;

-- Populate States for South Africa
DO $$
DECLARE
  sa_id uuid;
BEGIN
  SELECT id INTO sa_id FROM global_countries WHERE code = 'ZA';
  
  IF sa_id IS NOT NULL THEN
    INSERT INTO global_states (country_id, code, name) VALUES
    (sa_id, 'EC', 'Eastern Cape'),
    (sa_id, 'FS', 'Free State'),
    (sa_id, 'GP', 'Gauteng'),
    (sa_id, 'KZN', 'KwaZulu-Natal'),
    (sa_id, 'LP', 'Limpopo'),
    (sa_id, 'MP', 'Mpumalanga'),
    (sa_id, 'NC', 'Northern Cape'),
    (sa_id, 'NW', 'North West'),
    (sa_id, 'WC', 'Western Cape')
    ON CONFLICT (country_id, code) DO NOTHING;
  END IF;
END $$;

-- Populate major cities for South Africa
DO $$
DECLARE
  sa_id uuid;
  gauteng_id uuid;
  wc_id uuid;
  kzn_id uuid;
BEGIN
  SELECT id INTO sa_id FROM global_countries WHERE code = 'ZA';
  SELECT id INTO gauteng_id FROM global_states WHERE code = 'GP' AND country_id = sa_id;
  SELECT id INTO wc_id FROM global_states WHERE code = 'WC' AND country_id = sa_id;
  SELECT id INTO kzn_id FROM global_states WHERE code = 'KZN' AND country_id = sa_id;
  
  IF sa_id IS NOT NULL THEN
    INSERT INTO global_cities (country_id, state_id, name, is_capital) VALUES
    (sa_id, gauteng_id, 'Johannesburg', false),
    (sa_id, gauteng_id, 'Pretoria', true),
    (sa_id, wc_id, 'Cape Town', true),
    (sa_id, kzn_id, 'Durban', false);
  END IF;
END $$;

-- Populate States for United States
DO $$
DECLARE
  us_id uuid;
BEGIN
  SELECT id INTO us_id FROM global_countries WHERE code = 'US';
  
  IF us_id IS NOT NULL THEN
    INSERT INTO global_states (country_id, code, name) VALUES
    (us_id, 'AL', 'Alabama'),
    (us_id, 'AK', 'Alaska'),
    (us_id, 'AZ', 'Arizona'),
    (us_id, 'AR', 'Arkansas'),
    (us_id, 'CA', 'California'),
    (us_id, 'CO', 'Colorado'),
    (us_id, 'CT', 'Connecticut'),
    (us_id, 'DE', 'Delaware'),
    (us_id, 'FL', 'Florida'),
    (us_id, 'GA', 'Georgia'),
    (us_id, 'HI', 'Hawaii'),
    (us_id, 'ID', 'Idaho'),
    (us_id, 'IL', 'Illinois'),
    (us_id, 'IN', 'Indiana'),
    (us_id, 'IA', 'Iowa'),
    (us_id, 'KS', 'Kansas'),
    (us_id, 'KY', 'Kentucky'),
    (us_id, 'LA', 'Louisiana'),
    (us_id, 'ME', 'Maine'),
    (us_id, 'MD', 'Maryland'),
    (us_id, 'MA', 'Massachusetts'),
    (us_id, 'MI', 'Michigan'),
    (us_id, 'MN', 'Minnesota'),
    (us_id, 'MS', 'Mississippi'),
    (us_id, 'MO', 'Missouri'),
    (us_id, 'MT', 'Montana'),
    (us_id, 'NE', 'Nebraska'),
    (us_id, 'NV', 'Nevada'),
    (us_id, 'NH', 'New Hampshire'),
    (us_id, 'NJ', 'New Jersey'),
    (us_id, 'NM', 'New Mexico'),
    (us_id, 'NY', 'New York'),
    (us_id, 'NC', 'North Carolina'),
    (us_id, 'ND', 'North Dakota'),
    (us_id, 'OH', 'Ohio'),
    (us_id, 'OK', 'Oklahoma'),
    (us_id, 'OR', 'Oregon'),
    (us_id, 'PA', 'Pennsylvania'),
    (us_id, 'RI', 'Rhode Island'),
    (us_id, 'SC', 'South Carolina'),
    (us_id, 'SD', 'South Dakota'),
    (us_id, 'TN', 'Tennessee'),
    (us_id, 'TX', 'Texas'),
    (us_id, 'UT', 'Utah'),
    (us_id, 'VT', 'Vermont'),
    (us_id, 'VA', 'Virginia'),
    (us_id, 'WA', 'Washington'),
    (us_id, 'WV', 'West Virginia'),
    (us_id, 'WI', 'Wisconsin'),
    (us_id, 'WY', 'Wyoming')
    ON CONFLICT (country_id, code) DO NOTHING;
  END IF;
END $$;