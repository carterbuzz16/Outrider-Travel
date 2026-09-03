"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(): string {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function joinWaitlist(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    redirect("/?error=That doesn't look like a valid email.");
  }

  // Anonymous, pre-auth endpoint — throttle by IP rather than a user id
  // that doesn't exist yet.
  const allowed = await checkRateLimit(`waitlist:${clientIp()}`, 5, 60 * 60);
  if (!allowed) {
    redirect("/?error=Too many attempts. Please try again later.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("waitlist_signups").insert({ email });

  if (error && error.code !== "23505") {
    // 23505 = unique violation (already on the list) — treat as success
    // rather than surfacing a confusing error for a perfectly normal case.
    redirect("/?error=Something went wrong. Please try again.");
  }

  redirect("/?joined=1");
}
