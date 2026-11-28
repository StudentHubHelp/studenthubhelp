-- StudentHubHelp SEO city and editorial area metadata.
-- Additive only: existing listing tables, their policies, and admin permissions are unchanged.

create table if not exists public.cities (
  slug text primary key,
  name text not null,
  state text,
  tagline text,
  intro_text text,
  lat double precision,
  lng double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cities enable row level security;
revoke all on public.cities from anon, authenticated;
grant select on public.cities to anon, authenticated;
drop policy if exists seo_public_read_cities on public.cities;
create policy seo_public_read_cities
  on public.cities for select
  to anon, authenticated
  using (is_active = true);

alter table public.areas
  add column if not exists city_slug text,
  add column if not exists slug text,
  add column if not exists intro_text text,
  add column if not exists landmarks text[] not null default '{}',
  add column if not exists coaching_nearby text[] not null default '{}',
  add column if not exists profile_complete boolean not null default false,
  add column if not exists profile_source text,
  add column if not exists profile_reviewed_at timestamptz;

create unique index if not exists areas_city_slug_slug_uidx
  on public.areas (city_slug, slug)
  where city_slug is not null and slug is not null;

alter table public.areas enable row level security;
grant select on public.areas to anon, authenticated;
drop policy if exists seo_public_read_complete_areas on public.areas;
create policy seo_public_read_complete_areas
  on public.areas for select
  to anon, authenticated
  using (is_active = true and profile_complete = true);

insert into public.cities (slug, name, state, tagline, is_active)
values
  ('sikar','Sikar','Rajasthan','Student living and study options in Sikar',true),
  ('jaipur','Jaipur','Rajasthan','Student living and study options in Jaipur',true),
  ('jhunjhunu','Jhunjhunu','Rajasthan','Student living and study options in Jhunjhunu',true),
  ('kota','Kota','Rajasthan','Student living and study options in Kota',true),
  ('delhi','Delhi','Delhi','Student living and study options in Delhi',true),
  ('gurugram','Gurugram','Haryana','Student living and study options in Gurugram',true),
  ('bengaluru','Bengaluru','Karnataka','Student living and study options in Bengaluru',true),
  ('patna','Patna','Bihar','Student living and study options in Patna',true),
  ('chennai','Chennai','Tamil Nadu','Student living and study options in Chennai',true),
  ('pune','Pune','Maharashtra','Student living and study options in Pune',true),
  ('coimbatore','Coimbatore','Tamil Nadu','Student living and study options in Coimbatore',true),
  ('lucknow','Lucknow','Uttar Pradesh','Student living and study options in Lucknow',true),
  ('ahmedabad','Ahmedabad','Gujarat','Student living and study options in Ahmedabad',true),
  ('hyderabad','Hyderabad','Telangana','Student living and study options in Hyderabad',true)
on conflict (slug) do update set
  name=excluded.name,
  state=excluded.state,
  tagline=coalesce(public.cities.tagline,excluded.tagline),
  is_active=true,
  updated_at=now();

insert into public.areas (
  id, name, city, state, city_slug, slug, intro_text, landmarks,
  coaching_nearby, profile_complete, profile_source, profile_reviewed_at, is_active
)
select
  coalesce(max(id),0)+1,
  'Piprali Road',
  'Sikar',
  'Rajasthan',
  'sikar',
  'piprali-road',
  'Piprali Road is a locality represented in StudentHubHelp''s Sikar listing data, including library and student-service records. When comparing options here, students should check the provider''s complete address rather than relying on a broad locality label alone. Local reference names supplied for this guide include Piprali Circle, the Samrathpura side and ALLEN Career Institute. These references are orientation cues only: they do not confirm that a listing is next to a landmark, nor do they establish walking distance or travel time. Open each listing''s map, confirm the route, and contact the provider to verify current seats, fees, opening hours and availability before visiting.',
  array['Piprali Circle','Samrathpura'],
  array['ALLEN Career Institute'],
  true,
  'owner-supplied-local-context',
  '2026-11-28T00:00:00Z'::timestamptz,
  true
from public.areas
on conflict (city_slug, slug) do update set
  name=excluded.name,
  city=excluded.city,
  state=excluded.state,
  intro_text=excluded.intro_text,
  landmarks=excluded.landmarks,
  coaching_nearby=excluded.coaching_nearby,
  profile_complete=excluded.profile_complete,
  profile_source=excluded.profile_source,
  profile_reviewed_at=excluded.profile_reviewed_at,
  is_active=true,
  updated_at=now();

