-- Enable Row Level Security on all public tables so they are not exposed
-- through Supabase's auto-generated REST API by default. No policies are
-- defined yet — add them once the auth provider (Clerk vs. Supabase Auth)
-- is decided, since policies typically key off auth.uid() or a JWT claim.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
