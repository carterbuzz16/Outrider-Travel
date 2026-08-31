"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
