-- Two hidden test trips for spring break, so the whole booking flow can be run
-- with a Stripe test card on a local build before the real trips are published.
--
-- The sandbox shares the live database. The "[seed] " name prefix hides these from
-- the live site (lib/booking-window.ts, isTestTrip) and refuses a booking on them
-- there; they appear only under `dev-test-trips` in launch.json. Same dates as the
-- real weeks, so they get the real payment schedule, and separate tier rows, so
-- test bookings never hold a real bed. No capacity, as the real trips start out
-- (Carter, 3 November 2026: no limit on rooms for now).
--
-- Test only with a test account (carterbusby1+N@gmail.com or @resend.dev). The
-- sandbox refuses anyone else, because a real account would lose its saved card.
-- Delete any test bookings before December 15, 2026: the installment cron does not
-- check for test trips.
--
-- Run once in the Supabase SQL editor. scripts/seed.ts carries the same data.
with t as (
  insert into trips (name, destination, start_date, end_date, description, status, images)
  values
    ('[seed] Spring break March 8 test', 'Seed Beach, Punta Cana', '2027-03-08', '2027-03-12',
     'Test copy of the March 8 spring break departure, for checkout testing.', 'published', '{}'),
    ('[seed] Spring break March 15 test', 'Seed Beach, Punta Cana', '2027-03-15', '2027-03-19',
     'Test copy of the March 15 spring break departure, for checkout testing.', 'published', '{}')
  returning id
)
insert into tiers (trip_id, name, price, max_capacity, description, inclusions)
select id, 'TWO TO A ROOM', 1200, null::int, 'Two to a room with two queen beds, at Zemi Miches.',
       array['Four nights, all-inclusive', 'Airport transfers, both ways', 'A welcome happy hour', 'A welcome gift', 'Our team on site']
from t;
