-- Combined: Create all tables, columns, policies, and indexes

-- Customers table (create first since orders references it)
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  latitude numeric,
  longitude numeric,
  address_text text,
  password_hash text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  latitude numeric,
  longitude numeric,
  address_text text,
  tank_size text,
  notes text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
  whatsapp_sent boolean NOT NULL DEFAULT false,
  paid_amount numeric DEFAULT 0,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name text NOT NULL DEFAULT 'مياه الصفا',
  logo_url text,
  whatsapp_number text NOT NULL DEFAULT '966500000000',
  confirmation_message text NOT NULL DEFAULT 'تم استلام طلبك بنجاح! سنتواصل معك قريباً لتأكيد التوصيل.',
  served_cities text[] NOT NULL DEFAULT ARRAY['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة'],
  show_tank_size boolean NOT NULL DEFAULT true,
  map_default_lat numeric NOT NULL DEFAULT 24.7136,
  map_default_lng numeric NOT NULL DEFAULT 46.6753,
  admin_setup_code text NOT NULL DEFAULT 'MIYAH2026',
  cycle_start_date timestamptz DEFAULT now(),
  show_work_hours boolean DEFAULT true,
  work_hours_message text,
  work_hours_from text DEFAULT '8:00 صباحاً',
  work_hours_to text DEFAULT '10:00 مساءً',
  admin_email text,
  admin_password text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

INSERT INTO settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
