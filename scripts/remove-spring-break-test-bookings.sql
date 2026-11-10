-- Removes the test bookings on the hidden "[seed]" spring break weeks (10 November
-- 2026), for Carter to run once in the Supabase SQL editor before launch.
--
-- Only bookings on a "[seed]" trip made from a test account
-- (carterbusby1+...@gmail.com or @resend.dev) are touched. Their payments were
-- Stripe test mode, so nothing is refunded; deleting the scheduled row is what
-- stops the January 8 charge the installment cron would otherwise try (it does not
-- skip test trips). The [seed] trips themselves stay, hidden, for the next test.
--
-- payments and legal_acceptances block a booking's delete, so they go first;
-- rooming requests, traveler details and code redemptions go with the booking.
begin;

create temporary table doomed on commit drop as
select b.id
from bookings b
join trips t on t.id = b.trip_id
join auth.users u on u.id = b.user_id
where t.name like '[seed] Spring break%'
  and (u.email like 'carterbusby1+%@gmail.com' or u.email like '%@resend.dev');

select count(*) as test_bookings_to_remove from doomed;

delete from payments where booking_id in (select id from doomed);
delete from legal_acceptances where booking_id in (select id from doomed);
delete from bookings where id in (select id from doomed);

commit;
