-- RLS policies for the customer-facing booking/checkout flow. All writes to
-- bookings/payments go through the service-role client (see
-- app/(protected)/bookings/actions.ts and lib/payments.ts) — deliberately
-- no INSERT/UPDATE policies here, only the SELECT access each page needs.
--
-- This migration reconstructs policies that were already applied directly
-- to the database (outside migration history) while building the booking
-- flow. It's written now so a fresh database ends up in the same state.

CREATE POLICY "Authenticated users can view published trips" ON "trips"
  FOR SELECT TO authenticated
  USING (status = 'published');

CREATE POLICY "Authenticated users can view tiers of published trips" ON "tiers"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = tiers.trip_id AND trips.status = 'published'
    )
  );

CREATE POLICY "Users can view own bookings" ON "bookings"
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view payments for own bookings" ON "payments"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id AND bookings.user_id = (select auth.uid())
    )
  );
