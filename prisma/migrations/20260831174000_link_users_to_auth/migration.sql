-- Link public.users to Supabase Auth: profile rows share their id with
-- auth.users so a signed-in user's row is unambiguous, and are populated
-- automatically by a trigger rather than application code.

ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users"
  ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES auth.users(id) ON DELETE CASCADE;

-- Populate public.users when a new Supabase Auth account is created.
-- SECURITY DEFINER is required here (the trigger fires as the role that
-- inserted into auth.users, which lacks INSERT on public.users). This is
-- safe: search_path is locked down, all references are schema-qualified,
-- and Postgres trigger functions cannot be invoked directly (only via the
-- trigger itself), so this can't be called as an arbitrary public RPC.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'name');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- handle_new_user is only meant to run as the trigger above. Postgres
-- grants EXECUTE to PUBLIC by default for new functions, which would
-- otherwise expose it (harmlessly, but needlessly) at
-- /rest/v1/rpc/handle_new_user.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Let a signed-in user read and update their own profile row.
CREATE POLICY "Users can view own profile" ON "users"
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON "users"
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
