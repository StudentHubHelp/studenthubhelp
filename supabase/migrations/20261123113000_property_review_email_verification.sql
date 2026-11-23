-- Verified email submissions for property-specific reviews.
-- Reviews remain pending until an administrator approves them.
alter table private.platform_review_verifications
  add column if not exists property_id text,
  add column if not exists property_type text;

create or replace function public.create_property_review_verification(
  p_user_name text, p_email text, p_rating numeric, p_review_text text,
  p_token_hash text, p_expires_at timestamptz, p_ip_hash text,
  p_property_id text, p_property_type text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare new_id uuid;
declare target_table text;
declare listing_exists boolean := false;
begin
  if p_user_name is null or char_length(btrim(p_user_name)) not between 2 and 80
     or p_email is null or p_email !~* '^[A-Z0-9._%+-]+@gmail[.]com$'
     or p_rating < 1 or p_rating > 5
     or p_review_text is null or char_length(btrim(p_review_text)) not between 5 and 800
     or p_token_hash is null or char_length(p_token_hash) <> 64
     or p_expires_at <= now() or p_expires_at > now() + interval '1 hour'
     or p_property_id is null or length(btrim(p_property_id)) = 0 then
    raise exception 'Invalid property review verification request';
  end if;
  target_table := case lower(p_property_type)
    when 'hostel' then 'hostels' when 'tiffin' then 'tiffins'
    when 'library' then 'libraries' when 'cafe' then 'cafes'
    when 'bookstore' then 'bookstores' else null end;
  if target_table is null then raise exception 'Invalid property category'; end if;
  execute format(
    'select exists(select 1 from public.%I where id::text = $1 and (status is null or lower(status::text) = ''active''))',
    target_table
  ) into listing_exists using p_property_id;
  if not listing_exists then raise exception 'Property is not currently active'; end if;
  delete from private.platform_review_verifications
   where lower(email)=lower(p_email) and consumed_at is null and expires_at < now();
  insert into private.platform_review_verifications
    (user_name,email,rating,review_text,token_hash,ip_hash,expires_at,property_id,property_type)
  values (btrim(p_user_name),lower(btrim(p_email)),p_rating,btrim(p_review_text),p_token_hash,p_ip_hash,p_expires_at,p_property_id,lower(p_property_type))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.finalize_property_review_verification(p_token_hash text)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare pending private.platform_review_verifications%rowtype;
declare new_review_id bigint;
begin
  select * into pending from private.platform_review_verifications
  where token_hash=p_token_hash and property_id is not null
    and consumed_at is null and expires_at > now()
  for update;
  if not found then raise exception 'Verification link is invalid, expired, or already used'; end if;
  insert into public.reviews
    (property_id,user_id,user_name,rating,review_text,status,student_id,property_type,review_scope,review_source)
  values
    (pending.property_id,null,pending.user_name,pending.rating::text,pending.review_text,'pending',null,pending.property_type,'property','public_verified_email')
  returning id into new_review_id;
  update private.platform_review_verifications
  set verified_at=now(),consumed_at=now(),review_id=new_review_id where id=pending.id;
  insert into private.platform_review_contacts(review_id,email) values(new_review_id,pending.email);
  return new_review_id;
end;
$$;

revoke all on function public.create_property_review_verification(text,text,numeric,text,text,timestamptz,text,text,text) from public, anon, authenticated;
revoke all on function public.finalize_property_review_verification(text) from public, anon, authenticated;
grant execute on function public.create_property_review_verification(text,text,numeric,text,text,timestamptz,text,text,text) to service_role;
grant execute on function public.finalize_property_review_verification(text) to service_role;
