-- Keep review submitter email addresses out of the exposed public reviews table.
-- Existing verified email is preserved in a private, non-exposed table.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.platform_review_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  email text NOT NULL,
  rating numeric(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL CHECK (char_length(review_text) BETWEEN 5 AND 800),
  token_hash text NOT NULL UNIQUE,
  ip_hash text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  consumed_at timestamptz,
  review_id bigint REFERENCES public.reviews(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS platform_review_verifications_email_created_idx
  ON private.platform_review_verifications (email, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_review_verifications_expiry_idx
  ON private.platform_review_verifications (expires_at);

CREATE TABLE IF NOT EXISTS private.platform_review_contacts (
  review_id bigint PRIMARY KEY REFERENCES public.reviews(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO private.platform_review_contacts (review_id, email)
SELECT id, reviewer_email FROM public.reviews WHERE reviewer_email IS NOT NULL
ON CONFLICT (review_id) DO UPDATE SET email = EXCLUDED.email;

ALTER TABLE private.platform_review_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.platform_review_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.platform_review_verifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON private.platform_review_contacts FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS verified_users_can_insert_platform_reviews ON public.reviews;
ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.reviews DROP COLUMN IF EXISTS reviewer_email;

REVOKE ALL ON public.reviews FROM anon;
REVOKE SELECT ON public.reviews FROM authenticated;
GRANT SELECT (
  id, property_id, user_id, user_name, rating, review_text, status, created_at,
  student_id, property_type, published_review_text, pending_review_text,
  pending_rating, review_scope, review_source
) ON public.reviews TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_platform_review_verification(
  p_user_name text,
  p_email text,
  p_rating numeric,
  p_review_text text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_ip_hash text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE new_id uuid;
BEGIN
  IF p_user_name IS NULL OR char_length(btrim(p_user_name)) NOT BETWEEN 2 AND 80
     OR p_email IS NULL OR p_email !~* '^[A-Z0-9._%+-]+@gmail[.]com$'
     OR p_rating < 1 OR p_rating > 5
     OR p_review_text IS NULL OR char_length(btrim(p_review_text)) NOT BETWEEN 5 AND 800
     OR p_token_hash IS NULL OR char_length(p_token_hash) <> 64
     OR p_expires_at <= now() OR p_expires_at > now() + interval '1 hour' THEN
    RAISE EXCEPTION 'Invalid platform review verification request';
  END IF;
  DELETE FROM private.platform_review_verifications
   WHERE lower(email) = lower(p_email) AND consumed_at IS NULL AND expires_at < now();
  INSERT INTO private.platform_review_verifications
    (user_name,email,rating,review_text,token_hash,ip_hash,expires_at)
  VALUES
    (btrim(p_user_name),lower(btrim(p_email)),p_rating,btrim(p_review_text),p_token_hash,p_ip_hash,p_expires_at)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_platform_review_verification(p_token_hash text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE pending private.platform_review_verifications%ROWTYPE;
DECLARE new_review_id bigint;
BEGIN
  SELECT * INTO pending
  FROM private.platform_review_verifications
  WHERE token_hash = p_token_hash
    AND consumed_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification link is invalid, expired, or already used';
  END IF;

  INSERT INTO public.reviews (
    property_id, user_id, user_name, rating, review_text, status, student_id,
    property_type, review_scope, review_source
  ) VALUES (
    'studenthubhelp-platform', NULL, pending.user_name, pending.rating::text,
    pending.review_text, 'published', NULL, 'platform', 'platform', 'public_verified_email'
  ) RETURNING id INTO new_review_id;

  UPDATE private.platform_review_verifications
  SET verified_at = now(), consumed_at = now(), review_id = new_review_id
  WHERE id = pending.id;

  INSERT INTO private.platform_review_contacts(review_id,email)
  VALUES (new_review_id,pending.email);

  RETURN new_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_platform_review_verification(text,text,numeric,text,text,timestamptz,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_platform_review_verification(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_platform_review_verification(text,text,numeric,text,text,timestamptz,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_platform_review_verification(text) TO service_role;

NOTIFY pgrst, 'reload schema';
