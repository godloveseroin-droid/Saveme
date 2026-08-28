/*
# Fix crypt() function references to use extensions schema

The pgcrypto extension is installed in the `extensions` schema, not `public`.
Updated both SECURITY DEFINER functions to reference extensions.crypt() and extensions.gen_salt() explicitly.
*/

CREATE OR REPLACE FUNCTION verify_user_pin(p_worker_name text, p_pin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_account user_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_account FROM user_accounts WHERE worker_name = p_worker_name LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_account.password_hash = crypt(p_pin, v_account.password_hash) THEN
    RETURN v_account.id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION ensure_user_pins()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_worker record;
  v_pin text;
  v_count integer := 0;
  v_existing text;
BEGIN
  FOR v_worker IN SELECT name FROM game_workers ORDER BY name LOOP
    SELECT password_hash INTO v_existing FROM user_accounts WHERE worker_name = v_worker.name;
    IF v_existing IS NOT NULL THEN
      CONTINUE;
    END IF;

    LOOP
      v_pin := lpad(floor(random() * 100000)::text, 5, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM user_accounts WHERE password_hash = crypt(v_pin, password_hash));
    END LOOP;

    INSERT INTO user_accounts (worker_name, password_hash)
    VALUES (v_worker.name, crypt(v_pin, gen_salt('bf')));
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_user_pin(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_pins() TO anon, authenticated;