-- Combined: All RPC functions with suspension check in login_customer

-- Customer signup function
CREATE OR REPLACE FUNCTION signup_customer(
  p_name text,
  p_phone text,
  p_password text,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_address_text text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  existing_count int;
  new_id uuid;
  new_name text;
  new_phone text;
  new_lat numeric;
  new_lng numeric;
  new_addr text;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM customers WHERE phone = p_phone;
  IF existing_count > 0 THEN
    RETURN jsonb_build_object('error', 'phone_exists');
  END IF;

  INSERT INTO customers (name, phone, password_hash, latitude, longitude, address_text)
  VALUES (p_name, p_phone, crypt(p_password, gen_salt('bf')), p_latitude, p_longitude, p_address_text)
  RETURNING id, name, phone, latitude, longitude, address_text
  INTO new_id, new_name, new_phone, new_lat, new_lng, new_addr;

  RETURN jsonb_build_object(
    'id', new_id,
    'name', new_name,
    'phone', new_phone,
    'latitude', new_lat,
    'longitude', new_lng,
    'address_text', new_addr
  );
END;
$$;

GRANT EXECUTE ON FUNCTION signup_customer TO anon, authenticated;

-- Customer login function (with account suspension check)
CREATE OR REPLACE FUNCTION login_customer(
  p_phone text,
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
  v_name text;
  v_phone text;
  v_lat numeric;
  v_lng numeric;
  v_addr text;
  v_hash text;
  v_is_active boolean;
BEGIN
  SELECT id, name, phone, latitude, longitude, address_text, password_hash, is_active
  INTO v_id, v_name, v_phone, v_lat, v_lng, v_addr, v_hash, v_is_active
  FROM customers WHERE phone = p_phone;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_is_active IS FALSE THEN
    RETURN jsonb_build_object('error', 'account_suspended');
  END IF;

  IF v_hash IS NULL THEN
    RETURN jsonb_build_object('error', 'no_password');
  END IF;

  IF v_hash = crypt(p_password, v_hash) THEN
    RETURN jsonb_build_object(
      'id', v_id,
      'name', v_name,
      'phone', v_phone,
      'latitude', v_lat,
      'longitude', v_lng,
      'address_text', v_addr
    );
  ELSE
    RETURN jsonb_build_object('error', 'wrong_password');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION login_customer TO anon, authenticated;

-- Check if admin exists
CREATE OR REPLACE FUNCTION admin_exists()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM auth.users
    WHERE raw_app_meta_data->>'role' = 'admin'
    AND deleted_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION admin_exists() TO anon, authenticated;

-- Verify admin setup code
CREATE OR REPLACE FUNCTION verify_admin_setup_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored text;
BEGIN
  SELECT admin_setup_code INTO v_stored FROM settings WHERE id = 1;
  RETURN v_stored = p_code;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_admin_setup_code TO anon, authenticated;

-- Create admin user
CREATE OR REPLACE FUNCTION create_admin(
  p_email text,
  p_password text,
  p_setup_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_count int;
  v_stored_code text;
  v_new_id uuid;
BEGIN
  SELECT admin_setup_code INTO v_stored_code FROM public.settings WHERE id = 1;
  IF v_stored_code IS DISTINCT FROM p_setup_code THEN
    RETURN jsonb_build_object('error', 'invalid_setup_code');
  END IF;

  SELECT COUNT(*) INTO v_count FROM auth.users
  WHERE raw_app_meta_data->>'role' = 'admin' AND deleted_at IS NULL;
  IF v_count > 0 THEN
    RETURN jsonb_build_object('error', 'admin_exists');
  END IF;

  SELECT COUNT(*) INTO v_count FROM auth.users WHERE email = p_email AND deleted_at IS NULL;
  IF v_count > 0 THEN
    RETURN jsonb_build_object('error', 'email_used');
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    email_change, email_change_token_new, email_change_token_current,
    email_change_confirm_status, recovery_token, confirmation_token,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"role": "admin"}'::jsonb, '{"role": "admin"}'::jsonb, false,
    '', '', '', 0, '', '',
    false, false
  ) RETURNING id INTO v_new_id;

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_new_id::text,
    v_new_id,
    jsonb_build_object('sub', v_new_id::text, 'email', p_email),
    'email',
    now(), now(), now()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION create_admin TO anon, authenticated;

-- Delete all orders for a given phone number
CREATE OR REPLACE FUNCTION delete_customer_orders(phone_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM orders WHERE phone = phone_number;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_customer_orders TO anon, authenticated;
