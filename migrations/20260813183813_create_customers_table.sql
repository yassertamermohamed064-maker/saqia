/*
# Create customers table and add customer_id to orders

1. New Tables
- `customers` — stores customer profiles for recurring identification
  - id (uuid, primary key)
  - name (text, not null) — customer's full name
  - phone (text, not null, unique) — Saudi mobile number
  - latitude (numeric) — saved delivery location latitude
  - longitude (numeric) — saved delivery location longitude
  - address_text (text) — saved readable address
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())

2. Modified Tables
- `orders` — add `customer_id` column (nullable, references customers)
  This links each order to the customer who placed it.

3. Security
- Enable RLS on customers.
- Allow anon + authenticated CRUD (customer flow uses anon key, admin uses authenticated).
- customers table is intentionally accessible to anon since customers self-register by phone.

4. Notes
- The customer_id column on orders is nullable so existing orders are not affected.
- A unique constraint on phone ensures one account per phone number.
*/

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  latitude numeric,
  longitude numeric,
  address_text text,
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

-- Add customer_id to orders table (nullable for backwards compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
