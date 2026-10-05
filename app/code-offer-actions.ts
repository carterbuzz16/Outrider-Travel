"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, FAIL_CLOSED } from "@/lib/rate-limit";
import { honeypotTripped } from "@/lib/honeypot";
import { clientIp } from "@/lib/client-ip";
import { addContactToAudience } from "@/lib/resend-audience";
import { sendCodeOfferEmail, sendWaitlistNotification } from "@/lib/email/send";
import { earlyAccessFromPrice } from "@/lib/early-access";
import { discountCodeAmount } from "@/lib/discount-codes";
import { isDeliverableEmail, WAITLIST_ERRORS } from "@/lib/waitlist-signup";
import { CODE_OFFER_CONSENT_VERSION } from "@/lib/waitlist-consent";
import { cleanSignupContext, type SignupContext } from "@/lib/signup-context";
import { CODE_OFFER_OPEN, OFFER_AMOUNT, offerExpiry } from "@/lib/code-offer";
import { generateOfferCode, setOfferCookie } from "@/lib/code-offer-server";
import type { Database } from "@/types/supabase";

/*
 * $100 off by email (lib/code-offer.ts): one field on /telluride, and a code
 * of their own straight back.
 *
 *   - One code per address, ever. Asking again emails the same code again
 *     while it still works, and never shows it: anyone can type anyone's
 *     address, and on screen it would be theirs to spend. Once it is used or
 *     past its week, the address has had its $100.
 *   - The address goes on the list table with its answer to the optional
 *     "Okay to email me about Outrider trips" box (CODE_OFFER_CONSENT_VERSION).
 *     A no is stored as false, which every send to the list skips; the code
 *     email and its two reminders go either way, because the sheet says they
 *     will (CODE_OFFER_PROMISE). A yes also adds them to the Resend audience.
 *   - Someone who unsubscribed gets their code on screen and nothing by email:
 *     the form is not the address's owner undoing that, since anyone can type
 *     anyone's address.
 *   - The code also goes into a cookie, so every Reserve on the site arrives at
 *     checkout with it off (lib/code-offer-server.ts).
 *
 * Public and unauthenticated, and every request can send an email, so it has
 * the waitlist's protections: the honeypot, then per-IP, per-address and
 * site-wide limits that fail closed.
 */

export type CodeOfferResult =
  /** A new code, theirs: shown, emailed (unless unsubscribed) and in the cookie. */
  | { ok: true; code: string; expiresAt: string; emailed: boolean }
  /**
   * The address already had a live code: emailed again, not shown. The trap
   * answers the same way, so a script learns nothing from it.
   */
  | { ok: true; code: null }
  | { ok: false; message: string; field?: "email" };

type ListRow = {
  id: string;
  offer_code: string | null;
  email_consent: boolean | null;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
  src: string | null;
  placement: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

const ROW_COLUMNS =
  "id, offer_code, email_consent, unsubscribed_at, unsubscribe_token, src, placement, utm_source, utm_medium, utm_campaign";

const UNIQUE_VIOLATION = "23505";

export async function claimCodeOffer(
  raw: { email?: unknown; emailConsent?: unknown },
  rawContext?: SignupContext,
  honeypot?: unknown,
): Promise<CodeOfferResult> {
  // The page no longer offers it (CODE_OFFER_OPEN), but a server action can
  // still be posted to by hand, so the switch is checked here too.
  if (!CODE_OFFER_OPEN) return { ok: false, message: "This offer has ended." };

  const email = String(raw?.email ?? "").trim().toLowerCase();
  if (!isDeliverableEmail(email)) return { ok: false, message: WAITLIST_ERRORS.email, field: "email" };
  // Strictly true: a string "false" from a hand-made POST is not a yes.
  const consent = raw?.emailConsent === true;
  const context = cleanSignupContext(rawContext);

  // Before the limits, so a trapped script spends none of the allowance real
  // visitors share. The same answer as an address that already has a code.
  if (honeypotTripped(honeypot)) return { ok: true, code: null };

  // In order, stopping at the first refusal, as on the waitlist. A campus
  // network can put a whole room behind one address, so the IP limits are
  // generous; the per-address limit is what stops the form being used to send
  // one inbox the same email over and over.
  const ip = await clientIp();
  if (!(await checkRateLimit(`code-offer:${ip}`, 20, 10 * 60, FAIL_CLOSED))) {
    return { ok: false, message: "Too many tries. Give it a few minutes." };
  }
  if (!(await checkRateLimit(`code-offer-ip-day:${ip}`, 60, 24 * 60 * 60, FAIL_CLOSED))) {
    return { ok: false, message: "Too many codes from this network today. Try on mobile data, or tomorrow." };
  }
  if (!(await checkRateLimit(`code-offer-email:${email}`, 4, 24 * 60 * 60, FAIL_CLOSED))) {
    return { ok: false, message: "We've already sent that address its code a few times today. Check your inbox and spam." };
  }
  if (!(await checkRateLimit("code-offer:global", 500, 24 * 60 * 60, FAIL_CLOSED))) {
    console.error(
      "CODE OFFER DAILY CAP: 500 code requests in 24 hours (or the rate limiter failed closed). New requests are refused until the window rolls over.",
    );
    return { ok: false, message: "We can't send codes right now. Try again later." };
  }

  const admin = createAdminClient();
  const h = await headers();
  const evidence = { ip: ip === "unknown" ? null : ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
  const now = new Date();

  const existing = await admin.from("waitlist_signups").select(ROW_COLUMNS).eq("email", email).maybeSingle();
  if (existing.error) {
    console.error(`code offer: list read failed: ${existing.error.code} ${existing.error.message}`);
    return { ok: false, message: "Something went wrong. Try again." };
  }
  let row = existing.data as ListRow | null;

  // -- asked before: the same code, again --------------------------------------
  if (row?.offer_code) {
    await recordConsent(admin, email, row, consent, context, evidence, now);
    return resend(admin, email, row, row.offer_code);
  }

  // -- a new code ----------------------------------------------------------------
  const expiresAt = offerExpiry(now);
  const code = await mintCode(admin, expiresAt);
  if (!code) return { ok: false, message: "Something went wrong. Try again." };

  if (!row) {
    const inserted = await admin
      .from("waitlist_signups")
      .insert({
        email,
        email_consent: consent,
        // The answer and when it was given, whichever way it went.
        email_consent_at: now.toISOString(),
        consent_text_version: CODE_OFFER_CONSENT_VERSION,
        consent_ip: evidence.ip,
        consent_user_agent: evidence.userAgent,
        src: context.src ?? null,
        placement: context.placement ?? null,
        utm_source: context.source ?? null,
        utm_medium: context.medium ?? null,
        utm_campaign: context.campaign ?? null,
        offer_code: code,
      })
      .select(ROW_COLUMNS)
      .single();
    if (!inserted.error) {
      row = inserted.data as ListRow;
    } else if (inserted.error.code === UNIQUE_VIOLATION) {
      // A double tap: the other request made the row first. Fall through and
      // attach to it, or use the code it attached.
      const again = await admin.from("waitlist_signups").select(ROW_COLUMNS).eq("email", email).maybeSingle();
      row = (again.data as ListRow | null) ?? null;
      if (!row) {
        await retireCode(admin, code);
        return { ok: false, message: "Something went wrong. Try again." };
      }
      if (row.offer_code) {
        await retireCode(admin, code);
        await recordConsent(admin, email, row, consent, context, evidence, now);
        return resend(admin, email, row, row.offer_code);
      }
    } else {
      console.error(`code offer: list insert failed: ${inserted.error.code} ${inserted.error.message}`);
      await retireCode(admin, code);
      return { ok: false, message: "Something went wrong. Try again." };
    }
  }

  if (row && row.offer_code !== code) {
    // On the list already, without a code: attach this one. Guarded, so a
    // second request racing this one cannot leave the row with two.
    const attached = await admin
      .from("waitlist_signups")
      .update({ offer_code: code, updated_at: now.toISOString() })
      .eq("id", row.id)
      .is("offer_code", null)
      .select(ROW_COLUMNS)
      .maybeSingle();
    if (attached.error || !attached.data) {
      await retireCode(admin, code);
      const again = await admin.from("waitlist_signups").select(ROW_COLUMNS).eq("id", row.id).maybeSingle();
      const winner = (again.data as ListRow | null)?.offer_code;
      if (again.data && winner) {
        await recordConsent(admin, email, again.data as ListRow, consent, context, evidence, now);
        return resend(admin, email, again.data as ListRow, winner);
      }
      console.error(`code offer: attach failed: ${attached.error?.code} ${attached.error?.message}`);
      return { ok: false, message: "Something went wrong. Try again." };
    }
    row = attached.data as ListRow;
    await recordConsent(admin, email, row, consent, context, evidence, now);
  } else if (row && consent) {
    // A new row that said yes: into the audience the list is mailed from.
    await addContactToAudience({ email }).catch((err) => console.error("code offer: audience add threw:", err));
  }

  await setOfferCookie(code, expiresAt);
  const emailed = row && !row.unsubscribed_at ? await sendCode(email, row.unsubscribe_token, code, expiresAt.toISOString()) : false;

  try {
    await sendWaitlistNotification(email, { event: "$100 code requested", ...context });
  } catch (err) {
    console.error("code offer: team note failed (code still issued):", err);
  }

  return { ok: true, code, expiresAt: expiresAt.toISOString(), emailed };
}

/**
 * A single-use code worth OFFER_AMOUNT, running out at `expiresAt`. A clash
 * with an existing code (one in a billion) just draws again.
 */
async function mintCode(admin: ReturnType<typeof createAdminClient>, expiresAt: Date): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateOfferCode();
    const { error } = await admin.from("discount_codes").insert({
      code,
      amount: OFFER_AMOUNT,
      max_uses: 1,
      note: "$100 by email, /telluride (lib/code-offer.ts)",
      expires_at: expiresAt.toISOString(),
    });
    if (!error) return code;
    if (error.code !== UNIQUE_VIOLATION) {
      console.error(`code offer: code insert failed: ${error.code} ${error.message}`);
      return null;
    }
  }
  return null;
}

/** Switches off a code that lost a race and was never handed to anyone. */
async function retireCode(admin: ReturnType<typeof createAdminClient>, code: string) {
  const { error } = await admin.from("discount_codes").update({ active: false }).eq("code", code);
  if (error) console.error(`code offer: could not retire unused code ${code}: ${error.message}`);
}

/**
 * The address's code again, by email only, while it still works. Not shown and
 * not put in this browser's cookie: whoever typed the address may not own it.
 * The visitor's own account, if signed in, is passed so that their own unpaid
 * checkout holding the code does not make it look used.
 */
async function resend(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  row: ListRow,
  code: string,
): Promise<CodeOfferResult> {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const [amount, saved] = await Promise.all([
    discountCodeAmount(admin, code, user?.id),
    admin.from("discount_codes").select("expires_at").eq("code", code).maybeSingle(),
  ]);
  const expiresAt = saved.data?.expires_at;
  if (amount === null || !expiresAt) {
    return {
      ok: false,
      field: "email",
      message: "That address has already had its $100 code, and it's been used or has run out.",
    };
  }
  if (!row.unsubscribed_at) await sendCode(email, row.unsubscribe_token, code, expiresAt);
  return { ok: true, code: null };
}

/** Never throws: the code is on screen whatever happens to the email. */
async function sendCode(email: string, unsubscribeToken: string, code: string, expiresAt: string): Promise<boolean> {
  try {
    await sendCodeOfferEmail(email, {
      kind: "code",
      code,
      expiresAt,
      unsubscribeToken,
      fromPrice: await earlyAccessFromPrice(),
    });
    return true;
  } catch (err) {
    console.error("CODE OFFER EMAIL FAILED: the code was issued and shown, but not emailed.", err);
    return false;
  }
}

/**
 * For an address already on the list: the box can only turn a no into a yes
 * (the unsubscribe link is what takes consent away), and where they came from
 * stays first touch, filled only where blank. Same rules as a repeat waitlist
 * signup (app/waitlist-actions.ts, mergeRepeat), and never on an unsubscribed
 * row.
 */
async function recordConsent(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  row: ListRow,
  consent: boolean,
  context: SignupContext,
  evidence: { ip: string | null; userAgent: string | null },
  now: Date,
) {
  if (row.unsubscribed_at) return;
  const patch: Database["public"]["Tables"]["waitlist_signups"]["Update"] = {};
  const sayingYes = consent && row.email_consent !== true;
  if (sayingYes) {
    patch.email_consent = true;
    patch.email_consent_at = now.toISOString();
    patch.consent_text_version = CODE_OFFER_CONSENT_VERSION;
    patch.consent_ip = evidence.ip;
    patch.consent_user_agent = evidence.userAgent;
  }
  if (!row.src && context.src) patch.src = context.src;
  if (!row.placement && context.placement) patch.placement = context.placement;
  if (!row.utm_source && context.source) patch.utm_source = context.source;
  if (!row.utm_medium && context.medium) patch.utm_medium = context.medium;
  if (!row.utm_campaign && context.campaign) patch.utm_campaign = context.campaign;
  if (Object.keys(patch).length === 0) return;
  patch.updated_at = now.toISOString();

  const { error } = await admin
    .from("waitlist_signups")
    .update(patch)
    .eq("id", row.id)
    .is("unsubscribed_at", null);
  if (error) console.error(`code offer: list update failed: ${error.code} ${error.message}`);
  if (!error && sayingYes) {
    await addContactToAudience({ email }).catch((err) => console.error("code offer: audience add threw:", err));
  }
}
