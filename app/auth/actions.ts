"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

// Vercel sets x-forwarded-for reliably; this is a best-effort identifier
// for anonymous requests (pre-auth), not a security boundary on its own.
function clientIp(): string {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// `next` comes from a user-controlled query param (set by middleware.ts
// when it bounces an unauthenticated user off a protected route) — only
// accept a same-site relative path, never an absolute URL, to avoid an
// open redirect.
function safeRedirectPath(path: FormDataEntryValue | null): string {
  const value = String(path ?? "");
  return value.startsWith("/") && !value.startsWith("//") ? value : "/bookings";
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectPath(formData.get("next"));

  // Keyed by email, not IP: the thing worth throttling is guesses against
  // one account, and IP-based limiting has its own problems (shared
  // NAT/proxy IPs punishing unrelated users).
  const allowed = await checkRateLimit(`login:${email.toLowerCase()}`, 5, 15 * 60);
  if (!allowed) {
    redirect(
      `/login?error=${encodeURIComponent("Too many login attempts. Try again in a few minutes.")}&next=${encodeURIComponent(next)}`
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Keyed by IP, not email: repeat signups to the same email just get
  // Supabase's "already registered" error regardless, so what's worth
  // throttling here is scripted mass account creation from one source.
  const allowed = await checkRateLimit(`signup:${clientIp()}`, 3, 60 * 60);
  if (!allowed) {
    redirect(`/signup?error=${encodeURIComponent("Too many signups from this network. Try again later.")}`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");

  // No session yet means the project requires email confirmation before
  // the account can log in.
  if (!data.session) {
    redirect("/login?message=Check your email to confirm your account, then log in.");
  }

  redirect("/bookings");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
