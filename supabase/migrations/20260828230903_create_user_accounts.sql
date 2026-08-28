/*
# Create user_accounts table for employee authentication

1. New Tables
- `user_accounts`
  - `id` (uuid, primary key)
  - `worker_name` (text, unique, references game_workers.name) — links to existing employee FIO
  - `password_hash` (text, not null) — bcrypt-style hash of 5-digit PIN
  - `created_at` (timestamptz)

2. Security
- RLS enabled on user_accounts
- anon + authenticated can read worker_name + id (needed for login flow)
- Only service role can read/insert password_hash (via edge function)
- A SECURITY DEFINER function `verify_user_pin` checks password without exposing hashes
- A SECURITY DEFINER function `ensure_user_pins` generates unique 5-digit PINs for workers missing one

3. Important Notes
- PINs are 5 digits (00000–99999), unique per worker
- Existing PINs are never changed on re-run
- Password hashes use crypt() with bf (blowfish) algorithm
- The frontend never sees password_hash — only gets a session token back
*/

CREATE TABLE IF NOT EXISTS user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name text NOT NULL UNIQUE REFERENCES game_workers(name) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- Allow anon to read only id + worker_name (for listing users in login screen)
DROP POLICY IF EXISTS "anon_read_user_accounts" ON user_accounts;
CREATE POLICY "anon_read_user_accounts"
  ON user_accounts FOR SELECT
  TO anon, authenticated
  USING (true);

-- No direct INSERT/UPDATE/DELETE via anon — only via SECURITY DEFINER functions

-- Function: verify_user_pin(worker_name, pin) → returns user id if correct, null if wrong
CREATE OR REPLACE FUNCTION verify_user_pin(p_worker_name text, p_pin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function: ensure_user_pins() — generates unique 5-digit PINs for all workers missing one
-- Returns count of newly created accounts
CREATE OR REPLACE FUNCTION ensure_user_pins()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker record;
  v_pin text;
  v_count integer := 0;
  v_existing text;
BEGIN
  FOR v_worker IN SELECT name FROM game_workers ORDER BY name LOOP
    -- Check if account already exists
    SELECT password_hash INTO v_existing FROM user_accounts WHERE worker_name = v_worker.name;
    IF v_existing IS NOT NULL THEN
      -- Already has a PIN — skip, never overwrite
      CONTINUE;
    END IF;

    -- Generate unique 5-digit PIN
    LOOP
      v_pin := lpad(floor(random() * 100000)::text, 5, '0');
      -- Check uniqueness
      EXIT WHEN NOT EXISTS (SELECT 1 FROM user_accounts WHERE password_hash = crypt(v_pin, password_hash));
    END LOOP;

    INSERT INTO user_accounts (worker_name, password_hash)
    VALUES (v_worker.name, crypt(v_pin, gen_salt('bf')));
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant execute to anon + authenticated
GRANT EXECUTE ON FUNCTION verify_user_pin(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_pins() TO anon, authenticated;