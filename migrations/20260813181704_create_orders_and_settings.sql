/*
# Create orders and settings tables for water delivery app

1. New Tables
- `orders` — stores customer water delivery requests
  - id (uuid, primary key)
  - customer_name (text, not null) — customer's full name
  - phone (text, not null) — Saudi mobile number
  - latitude (numeric) — delivery location latitude
  - longitude (numeric) — delivery location longitude
  - address_text (text) — optional readable address
  - tank_size (text) — selected tank size (e.g. "200 لتر")
  - notes (text) — optional customer notes
  - status (text, default 'new') — one of: new, in_progress, completed, cancelled
  - whatsapp_sent (boolean, default false) — whether WhatsApp notification was sent
  - created_at (timestamptz, default now())
- `settings` — single-row app configuration (id always = 1)
  - id (int, primary key, default 1)
  - business_name (text) — displayed business name
  - logo_url (text) — logo image URL
  - whatsapp_number (text) — owner WhatsApp number
  - confirmation_message (text) — message shown after order
  - served_cities (text[]) — list of served cities
  - show_tank_size (boolean, default true) — whether tank size field is visible
  - map_default_lat (numeric) — default map center latitude
  - map_default_lng (numeric) — default map center longitude
  - updated_at (timestamptz, default now())

2. Security
- Enable RLS on both tables.
- This is a no-auth app (customers order without login; dashboard is accessed without sign-in).
- All policies use TO anon, authenticated so the anon-key client can operate.
- orders: anon can insert (place orders) and select/update/delete (dashboard management).
- settings: anon can select (read config) and update (save settings from dashboard).

3. Notes
- Settings table is seeded with a default row (id=1) with sensible defaults.
- Status values constrained via CHECK.
*/

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
