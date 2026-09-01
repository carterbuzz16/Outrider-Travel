-- Practical trip info (flight/airport guidance, packing, meeting point,
-- etc.) — distinct from the short marketing "description" already on
-- trips. Included in the booking confirmation email.
ALTER TABLE "trips" ADD COLUMN "logistics" TEXT;
