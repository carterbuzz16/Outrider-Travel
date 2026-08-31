-- Trip photos. Stored in a public Storage bucket — reads need no RLS
-- policy (Supabase serves public-bucket objects directly), and all writes
-- go through the service-role client from the admin trip form, same
-- pattern as every other privileged write in this app. No storage.objects
-- policies needed for either direction.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-images',
  'trip-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE "trips" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT '{}';
