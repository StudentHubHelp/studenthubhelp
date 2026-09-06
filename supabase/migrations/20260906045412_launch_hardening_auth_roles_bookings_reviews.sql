-- Applied to Supabase project idurlccrarznnnqixxsd.
-- Launch hardening: role-safe auth profile policies, booking idempotency,
-- review authorization, and removal of direct client execution for trigger helpers.

CREATE OR REPLACE FUNCTION public.sync_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE requested_role text;
BEGIN
  requested_role := lower(coalesce(NEW.raw_user_meta_data->>'role','student'));
  IF requested_role NOT IN ('student','owner') THEN requested_role := 'student'; END IF;
  INSERT INTO public.profiles (id, full_name, phone, role, email)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email,''),'@',1), 'User'),
          COALESCE(NEW.raw_user_meta_data->>'phone', ''),
          requested_role,
          NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "profile_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "sh_profile_own_insert" ON public.profiles;
CREATE POLICY "sh_profile_own_insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = id AND lower(coalesce(role,'')) IN ('student','owner'));

DROP POLICY IF EXISTS "profile_update_own" ON public.profiles;
DROP POLICY IF EXISTS "sh_profile_own_update" ON public.profiles;
CREATE POLICY "sh_profile_own_update" ON public.profiles FOR UPDATE TO authenticated
USING (id = (select auth.uid()) OR (select is_director_admin()))
WITH CHECK ((select is_director_admin()) OR (id = (select auth.uid()) AND lower(coalesce(role,'')) IN ('student','owner')));

CREATE UNIQUE INDEX IF NOT EXISTS student_bookings_one_live_per_property_idx
ON public.student_bookings (student_id, property_table, property_id)
WHERE lower(coalesce(status,'')) IN ('pending','active');

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_student_property_idx
ON public.reviews (student_id, property_id, property_type)
WHERE student_id IS NOT NULL;

REVOKE EXECUTE ON FUNCTION public.allocate_global_public_id(text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_hostel_global_public_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_tiffin_global_public_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_library_global_public_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_cafe_global_public_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_bookstore_global_public_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_from_auth() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_email_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.route_owner_listing_insert_to_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_admin_notification_read_state() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_admin_notification_for_event() FROM PUBLIC, anon, authenticated;
