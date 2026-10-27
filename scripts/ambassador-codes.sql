-- Ambassador attribution codes, 27 October 2026.
--
-- One $0 code per ambassador. It takes nothing off; a booking made with it is
-- credited to the ambassador through its discount_redemptions row
-- (lib/discount-codes.ts). Run in the Supabase SQL editor AFTER the
-- tracking_only_codes migration
-- (prisma/migrations/20261027120000_tracking_only_codes), which lets a code
-- be worth $0. Before it, every row here fails discount_codes_amount_check.
--
-- Safe to run twice: a code that already exists is left exactly as it is
-- (on conflict do nothing), so a re-run never resets an edited row. None of
-- the 25 clashed with an existing code when this was written (the first 21
-- from the brief, then GRIGGS, MCLAREN, REKOUTIS and LAVERY the same day).
--
-- expires_at is the ambassador deadline, the end of 14 November 2026
-- Central; after it each code is refused like any expired code. Shared codes (max_uses above 1) may be as short as
-- 3 characters (shared_discount_codes migration), so AHO and ZHU are fine.

insert into public.discount_codes
  (code, amount, percent_off, max_uses, once_per_person, active, expires_at, note)
values
  ('STEIN',     0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Steven Stein, Miami. Created 2026-10-27.'),
  ('DETHLEFS',  0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Tim Dethlefs, Boise State. Created 2026-10-27.'),
  ('DEJESUS',   0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Jade De Jesus, UC Irvine. Created 2026-10-27.'),
  ('AHO',       0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Miller Aho, Tennessee. Created 2026-10-27.'),
  ('MACKENNA',  0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Maks Mackenna, Fairfield. Created 2026-10-27.'),
  ('DANKOWSKI', 0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Drew Dankowski, Rutgers. Created 2026-10-27.'),
  ('BALIAN',    0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Matthew Balian, USD. Created 2026-10-27.'),
  ('JIBAJA',    0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Henry Jibaja, South Carolina. Created 2026-10-27.'),
  ('COLLINS',   0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Michael Collins, Texas Tech. Created 2026-10-27.'),
  ('SHIELDS',   0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Matthew Shields, Texas A&M. Created 2026-10-27.'),
  ('LOONEY',    0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Austin Looney, Texas A&M. Created 2026-10-27.'),
  ('ERHART',    0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Jacob Erhart, Cincinnati. Created 2026-10-27.'),
  ('SULLIVAN',  0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Benton Sullivan, USD. Created 2026-10-27.'),
  ('ISAACUW',   0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Isaac, Washington. Created 2026-10-27.'),
  ('PANTEA',    0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Alex Pantea, New Mexico State. Created 2026-10-27.'),
  ('HOPKINS',   0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Johns Hopkins, Michigan. Created 2026-10-27.'),
  ('EWING',     0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Haley Ewing, Cal State San Marcos. Created 2026-10-27.'),
  ('ZHU',       0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Stanley Zhu, Illinois. Created 2026-10-27.'),
  ('ENGBLOM',   0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Jack Engblom, Penn State. Created 2026-10-27.'),
  ('DEHAAN',    0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Ezra DeHaan, South Dakota State. Created 2026-10-27.'),
  ('REYNOLDS',  0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for AnnElise Reynolds, Wake Tech. Created 2026-10-27.'),
  ('GRIGGS',    0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Tanner Griggs, Southern Adventist. Created 2026-10-27.'),
  ('MCLAREN',   0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Daniel McLaren, Clemson. Created 2026-10-27.'),
  ('REKOUTIS',  0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Alexios Rekoutis, Cornell. Created 2026-10-27.'),
  ('LAVERY',    0, null, 1000, false, true, timestamptz '2026-11-15 05:59:59+00', 'Ambassador attribution code ($0) for Robson Lavery, Mount Royal. Created 2026-10-27.')
on conflict (code) do nothing;

-- Check: should list 25 rows, every one amount 0.00, active, 1000 uses.
select code, amount, percent_off, max_uses, once_per_person, active, expires_at, note
from public.discount_codes
where amount = 0
order by code;
