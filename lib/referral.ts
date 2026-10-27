import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { REFERRAL_COOKIE, isLiveAttributionCode, normalizeReferralCode } from "@/lib/referral-cookie";

type Admin = SupabaseClient<Database>;

/*
 * Who referred a booking (27 October 2026). A booking can carry one
 * attribution code, an ambassador's $0 code, beside one discount code: STEIN
 * and CHPTR together take CHPTR's $150 off and still count for Steven Stein.
 * Both are claimed onto the booking by claim_discount_code, as
 * discount_redemptions rows of kind 'attribution' and 'discount'
 * (referrals_and_ambassadors migration). The attribution's `source` says how
 * it got there: 'link' from the ?ref= cookie (lib/referral-cookie.ts),
 * 'typed' into the Referred by box or the discount box, 'admin' from
 * /admin/ambassadors.
 */

export type Referral = { code: string; name: string };

/**
 * The live ambassador code `raw` names, with the ambassador's name for the
 * Referred by box, or null for anything else: unknown, switched off,
 * expired, or a code that takes money off. Every "no" looks the same, so the
 * box can never be used to find out whether a discount code exists.
 */
export async function lookupReferral(admin: Admin, raw: unknown): Promise<Referral | null> {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  const { data, error } = await admin
    .from("discount_codes")
    .select("code, amount, percent_off, active, expires_at, ambassadors(name)")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    console.error(`lookupReferral: ${error.code} ${error.message}`);
    return null;
  }
  if (!data || !isLiveAttributionCode(data)) return null;
  // A $0 code made without an ambassadors row still credits by its code.
  return { code: data.code, name: data.ambassadors?.name ?? data.code };
}

/** The code in this browser's referral cookie, unchecked. */
export async function referralCodeFromCookie(): Promise<string | null> {
  return normalizeReferralCode((await cookies()).get(REFERRAL_COOKIE)?.value);
}
