-- Fix create_admin function: correct auth.identities columns
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
    provider_id, user_id, identity_data, provider, email,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_new_id::text,
    v_new_id,
    jsonb_build_object('sub', v_new_id::text, 'email', p_email),
    'email',
    p_email,
    now(), now(), now()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION create_admin TO anon, authenticated;