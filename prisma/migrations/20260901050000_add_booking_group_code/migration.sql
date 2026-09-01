-- Lets travelers on the same trip find each other for room assignment
-- without one person paying for the whole group: each booking gets a
-- short code (auto-generated if not joining an existing one), and anyone
-- entering the same code while booking the same trip is grouped with them.
-- Payments stay entirely independent per booking.
ALTER TABLE "bookings" ADD COLUMN "group_code" TEXT;

-- Codes are looked up scoped to a trip (see createBooking in
-- bookings/actions.ts) — the same random code could coincidentally exist
-- on a different, unrelated trip, which is fine since it's never queried
-- without trip_id alongside it.
CREATE INDEX "bookings_trip_id_group_code_idx" ON "bookings"("trip_id", "group_code");
