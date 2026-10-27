-- Ambassador tracking: one row per $0 ambassador code, most paid in full first.
--
-- A booking is credited to an ambassador by the discount_redemptions row its
-- code left (lib/discount-codes.ts). Counted here:
--
--   deposit_only     status deposit_paid: the $100 is in, the rest is not.
--   paid_in_full     status paid_in_full.
--   active_bookings  the two together. Pending checkouts (nobody has paid)
--                    and cancelled bookings are left out, and so is a booking
--                    whose money all went back (a refunded payment and no
--                    succeeded one). A refund of an overpayment on a live
--                    booking leaves a succeeded payment, so it still counts.
--   to_reach_5       paid-in-full bookings still needed to reach five.
--
-- Test bookings are left out: [seed] and [test] trips, and Carter's own
-- test accounts (carterbusby1+N@gmail.com, @resend.dev).
--
-- Name and school come from the code's note, written as
-- "Ambassador attribution code ($0) for <Name>, <School>. Created ...".
-- Once the ambassadors table exists (Part B), take them from there instead.

with ambassador_codes as (
  select c.code, regexp_match(c.note, 'for ([^,]+), (.+)\. Created') as who
  from public.discount_codes c
  where c.amount = 0
),
credited as (
  select r.code, b.status
  from public.discount_redemptions r
  join public.bookings b on b.id = r.booking_id
  join public.trips t on t.id = b.trip_id
  join public.users u on u.id = b.user_id
  where b.status in ('deposit_paid', 'paid_in_full')
    and not (
      exists (select 1 from public.payments p where p.booking_id = b.id and p.status = 'refunded')
      and not exists (select 1 from public.payments p where p.booking_id = b.id and p.status = 'succeeded')
    )
    and t.name not like '[seed] %'
    and t.name not like '[test] %'
    and u.email not like 'carterbusby1%'
    and u.email not like '%@resend.dev'
)
select
  a.who[1] as ambassador,
  a.who[2] as school,
  a.code,
  count(*) filter (where cr.status = 'deposit_paid') as deposit_only,
  count(*) filter (where cr.status = 'paid_in_full') as paid_in_full,
  count(cr.status) as active_bookings,
  greatest(0, 5 - count(*) filter (where cr.status = 'paid_in_full')) as to_reach_5
from ambassador_codes a
left join credited cr on cr.code = a.code
group by a.code, a.who
order by paid_in_full desc, active_bookings desc, ambassador;
