import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

/**
 * Recording that a traveller accepted the Terms and the Assumption of Risk.
 *
 * This exists so there is an answer to "what did they agree to, and when".
 * Without it, Outrider takes deposits for an activity with real physical risk
 * and has nothing to point at if a booking is ever disputed.
 *
 * Three things make the record worth having:
 *   - it stores the document VERSION, not just a boolean, so the exact text
 *     accepted can be reproduced from lib/legal.ts;
 *   - it is written with the service role inside the booking action, so it
 *     cannot be forged or edited by the account it describes;
 *   - it is append-only. A booking is governed by the versions in force when it
 *     was made, so these rows are never updated or deleted.
 */

/** The documents a traveller must accept to book. */
export const REQUIRED_DOCUMENTS = ["terms", "assumption-of-risk"] as const;
export type RequiredDocument = (typeof REQUIRED_DOCUMENTS)[number];

/** Version of each required document as currently published. */
export function currentVersions(): Record<RequiredDocument, string> {
  const out = {} as Record<RequiredDocument, string>;
  for (const slug of REQUIRED_DOCUMENTS) {
    const doc = LEGAL_DOCUMENTS.find((d) => d.slug === slug);
    if (!doc) {
      throw new Error(`Required legal document "${slug}" is missing from lib/legal.ts`);
    }
    out[slug] = doc.version;
  }
  return out;
}

/**
 * Writes one row per required document.
 *
 * Throws on failure rather than logging and moving on: a booking that exists
 * without an acceptance record is precisely the situation this is meant to
 * prevent, so the caller must treat it as fatal and not confirm the booking.
 */
export async function recordAcceptance(opts: {
  bookingId: string;
  userId: string;
}): Promise<void> {
  const versions = currentVersions();
  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent")?.slice(0, 500) ?? null;

  const rows = REQUIRED_DOCUMENTS.map((slug) => ({
    booking_id: opts.bookingId,
    user_id: opts.userId,
    document_slug: slug,
    document_version: versions[slug],
    ip_address: ipAddress,
    user_agent: userAgent,
  }));

  const { error } = await createAdminClient().from("legal_acceptances").insert(rows);

  if (error) {
    throw new Error(
      `Failed to record legal acceptance for booking ${opts.bookingId}: ${error.code} ${error.message}`,
    );
  }
}

/** What a traveller accepted, for their own booking page. */
export async function getAcceptances(bookingId: string) {
  const { data, error } = await createAdminClient()
    .from("legal_acceptances")
    .select("document_slug, document_version, accepted_at")
    .eq("booking_id", bookingId);

  if (error) {
    console.error(`Failed to read legal acceptances: ${error.code} ${error.message}`);
    return [];
  }
  return data ?? [];
}
