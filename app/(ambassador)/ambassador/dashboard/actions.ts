"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalAccess, loadPortalView } from "@/lib/ambassador-portal";
import { programFor } from "@/lib/ambassador-program";
import { isTestTrip } from "@/lib/booking-window";
import { checkRateLimit, FAIL_CLOSED } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { getFromAddress, sendEmail } from "@/lib/email/send";

/*
 * What an ambassador can change from the portal: accepting the agreement,
 * hiding their name on the leaderboard, and picking the week for a free trip
 * they have earned. Each is a public POST endpoint, so each decides who is
 * asking from the session alone (getPortalAccess) and writes only that
 * ambassador's own row; nothing posted can name another. They report back by
 * redirecting with a short code the page looks up, never with text.
 */

const DASHBOARD = "/ambassador/dashboard";

function back(query?: Record<string, string>, hash = ""): never {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  redirect(`${DASHBOARD}${qs}${hash}`);
}

/** The signed-in ambassador, under a write limit, or back to the page (which explains). */
async function ambassadorOrBack() {
  const access = await getPortalAccess();
  if (access.kind !== "ambassador") back();
  // Fails closed: these write, and one sends an email.
  if (!(await checkRateLimit(`amb-write:${access.userId}`, 20, 10 * 60, FAIL_CLOSED))) back({ error: "busy" });
  return access;
}

export async function acceptAgreement(formData: FormData) {
  const { userId, ambassador } = await ambassadorOrBack();
  if (ambassador.agreedAt) back();
  if (formData.get("agree") !== "yes") back({ error: "agree" });

  const { agreement } = programFor(ambassador.program);
  const admin = createAdminClient();
  const ip = await clientIp();
  // Append-only evidence, like a booking's acceptance (lib/legal-acceptance.ts):
  // which version, when, from where. A double submit hits the unique index
  // for this account and version and changes nothing.
  const { error } = await admin.from("legal_acceptances").insert({
    booking_id: null,
    user_id: userId,
    document_slug: agreement.slug,
    document_version: agreement.version,
    ip_address: ip === "unknown" ? null : ip,
    user_agent: (await headers()).get("user-agent")?.slice(0, 500) ?? null,
  });
  if (error && error.code !== "23505") {
    console.error(`acceptAgreement ${ambassador.code}: ${error.code} ${error.message}`);
    back({ error: "save" });
  }

  const now = new Date().toISOString();
  const { error: agreedError } = await admin
    .from("ambassadors")
    .update({ agreed_at: now, updated_at: now })
    .eq("code", ambassador.code)
    .is("agreed_at", null);
  if (agreedError) {
    console.error(`acceptAgreement ${ambassador.code}: ${agreedError.code} ${agreedError.message}`);
    back({ error: "save" });
  }
  // Agreeing is what makes a selected ambassador active. Any later status
  // (earned, released) is the team's, and stays.
  await admin
    .from("ambassadors")
    .update({ status: "active", updated_at: now })
    .eq("code", ambassador.code)
    .in("status", ["onboarded", "accepted"]);
  back();
}

export async function setLeaderboardHidden(formData: FormData) {
  const { ambassador } = await ambassadorOrBack();
  if (!ambassador.agreedAt) back();
  const hidden = formData.get("hidden") === "yes";
  const { error } = await createAdminClient()
    .from("ambassadors")
    .update({ leaderboard_hidden: hidden, updated_at: new Date().toISOString() })
    .eq("code", ambassador.code);
  if (error) {
    console.error(`setLeaderboardHidden ${ambassador.code}: ${error.code} ${error.message}`);
    back({ error: "save" }, "#leaderboard");
  }
  back({ done: hidden ? "hidden" : "shown" }, "#leaderboard");
}

/**
 * The free trip, once earned: the ambassador picks December or January. Only
 * a departure their program names, only once, and only when the same count
 * the dashboard shows says they have reached the goal. The team hears about
 * it by email (ADMIN_NOTIFY_TO), and the admin page shows the pick.
 */
export async function claimFreeTrip(formData: FormData) {
  const { ambassador } = await ambassadorOrBack();
  if (!ambassador.agreedAt) back();
  const program = programFor(ambassador.program);

  const view = await loadPortalView(ambassador.code);
  if (!view?.rewards.goal) back({ error: "not_yet" }, "#rewards");
  if (view.rewards.picked) back(undefined, "#rewards");

  const tripId = String(formData.get("trip_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(tripId)) back({ error: "trip" }, "#rewards");
  const admin = createAdminClient();
  const { data: trip } = await admin
    .from("trips")
    .select("id, name, start_date, status")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip || trip.status !== "published" || isTestTrip(trip.name) || !program.departures[trip.start_date]) {
    back({ error: "trip" }, "#rewards");
  }

  const now = new Date().toISOString();
  const { data: claimed, error } = await admin
    .from("ambassadors")
    .update({ reward_trip_id: trip.id, reward_claimed_at: now, status: "earned", updated_at: now })
    .eq("code", ambassador.code)
    .is("reward_claimed_at", null)
    .select("code")
    .maybeSingle();
  if (error) {
    console.error(`claimFreeTrip ${ambassador.code}: ${error.code} ${error.message}`);
    back({ error: "save" }, "#rewards");
  }

  const to = process.env.ADMIN_NOTIFY_TO?.trim();
  if (claimed && to) {
    const week = program.departures[trip.start_date];
    try {
      await sendEmail({
        from: getFromAddress(),
        to,
        subject: `Free trip earned: ${ambassador.name} picked ${week.label}`,
        text: [
          `${ambassador.name} (${ambassador.code}${ambassador.school ? `, ${ambassador.school}` : ""}) reached ${program.goal} friends paid in full and picked ${week.label}, ${week.dates}.`,
          "",
          "Their counts and held spot are on /admin/ambassadors.",
        ].join("\n"),
      });
    } catch (err) {
      console.error(`claimFreeTrip ${ambassador.code}: alert not sent: ${err instanceof Error ? err.message : err}`);
    }
  }
  back({ done: "picked" }, "#rewards");
}
