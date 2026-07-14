-- Drop any permissive policies (USING/WITH CHECK true) currently allowing anon writes
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='arena_state'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.arena_state', r.policyname);
  END LOOP;
END $$;

-- Public read stays open (single shared row of app config/state)
CREATE POLICY "arena_state_select_all"
  ON public.arena_state FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes require an authenticated session (anonymous sign-in counts).
-- Scope by id=1 to enforce singleton pattern.
CREATE POLICY "arena_state_insert_authenticated"
  ON public.arena_state FOR INSERT
  TO authenticated
  WITH CHECK (id = 1);

CREATE POLICY "arena_state_update_authenticated"
  ON public.arena_state FOR UPDATE
  TO authenticated
  USING (id = 1)
  WITH CHECK (id = 1);

-- No DELETE policy => deletes blocked for anon and authenticated.

-- Ensure grants match policies
REVOKE INSERT, UPDATE, DELETE ON public.arena_state FROM anon;
GRANT SELECT ON public.arena_state TO anon;
GRANT SELECT, INSERT, UPDATE ON public.arena_state TO authenticated;
GRANT ALL ON public.arena_state TO service_role;