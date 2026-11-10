-- The two real spring break weeks (10 November 2026), for Carter to run once in the
-- Supabase SQL editor. Telluride's rows are untouched.
--
-- Published, so the spring-break branch (and its Vercel preview) sells them at once.
-- The live site stays as it is until that branch is deployed: main still has
-- SPRING_BREAK_DATES_CONFIRMED false, which hides spring break departures even when
-- published (lib/trips.ts). Publishing sends nothing: the "booking is open" email
-- only goes from /admin/launch.
--
-- 20 a week (tiers.max_capacity), raised later in /admin/trips with no deploy. The
-- package is named TWO TO A ROOM because lib/room-media.ts keys spring break's room
-- photographs on that name. The destination has to contain "Punta Cana" or "Miches"
-- for the site to treat it as spring break (lib/trip-lines.ts).
--
-- Safe to run twice: a week that already exists by name and date is skipped.
with wanted (start_date, end_date) as (
  values ('2027-03-08'::date, '2027-03-12'::date), ('2027-03-15'::date, '2027-03-19'::date)
), t as (
  insert into trips (name, destination, start_date, end_date, description, status, images)
  select 'Outrider Beach Club — Punta Cana, March 2027', 'Zemi Miches, Punta Cana', w.start_date, w.end_date,
         'Four nights at Zemi Miches, all-inclusive, on the beach in Miches, an hour and a half up the coast from Punta Cana.',
         'published', '{}'
  from wanted w
  where not exists (
    select 1 from trips x
    where x.name = 'Outrider Beach Club — Punta Cana, March 2027' and x.start_date = w.start_date
  )
  returning id
)
insert into tiers (trip_id, name, price, max_capacity, description, inclusions)
select id, 'TWO TO A ROOM', 1200, 20, 'Two of you, two queen beds',
       array['A Tropical View room at Zemi Miches with two queen beds, shared by two',
             'Four nights, all-inclusive',
             'Airport transfers from Punta Cana (PUJ) and back',
             'A welcome happy hour',
             'A welcome gift',
             'Outrider moments along the way',
             'Our team on the ground the whole trip']
from t;
