-- Applied to Supabase project idurlccrarznnnqixxsd.
-- Keep student booking requests pending even if an outdated frontend sends active.
CREATE OR REPLACE FUNCTION public.normalize_student_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_role text;
BEGIN
  SELECT lower(coalesce(role,'')) INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role = 'student' THEN NEW.status := 'pending'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_normalize_student_booking_insert ON public.student_bookings;
CREATE TRIGGER trg_normalize_student_booking_insert BEFORE INSERT ON public.student_bookings
FOR EACH ROW EXECUTE FUNCTION public.normalize_student_booking_insert();
REVOKE EXECUTE ON FUNCTION public.normalize_student_booking_insert() FROM PUBLIC, anon, authenticated;
