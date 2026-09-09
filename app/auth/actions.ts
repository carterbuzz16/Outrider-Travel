"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkPasswordPair } from "@/lib/password";
import { getAppUrl } from "@/lib/site-url";
import { safePath } from "@/lib/safe-path";
import { clientIp } from "@/lib/client-ip";

// Vercel sets x-forwarded-for reliably; this is a best-effort identifier
// for anonymous requests (pre-auth), not a security boundary on its own.

// `next` comes from a user-controlled query param (set by middleware.ts
// when it bounces an unauthenticated user off a protected route) — only
// accept a same-site relative path, never an absolute URL, to avoid an
// open redirect.
// Replaced by the shared guard in lib/safe-path.ts.

// Loose on purpose: the only job here is to keep obvious rubbish out of the
// Supabase call. Whether the address exists is never revealed either way.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safePath(formData.get("next"), "/bookings");

  // Keyed by email, not IP: the thing worth throttling is guesses against
  // one account, and IP-based limiting has its own problems (shared
  // NAT/proxy IPs punishing unrelated users).
  const allowed = await checkRateLimit(`login:${email.toLowerCase()}`, 5, 15 * 60);
  if (!allowed) {
    redirect(
      `/login?error=${encodeURIComponent("Too many login attempts. Try again in a few minutes.")}&next=${encodeURIComponent(next)}`
    );
  }

  const supabase = await createClient();
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
  const confirmation = String(formData.get("confirm_password") ?? "");
  // Signup is the other half of the same round trip as login: a visitor sent
  // here from "Reserve your spot" has to land back on the trip they picked,
  // not on a generic booking list. Carried through every redirect below, and
  // sanitised by the same guard login uses.
  const next = safePath(formData.get("next"), "/bookings");
  const nextQuery = `next=${encodeURIComponent(next)}`;

  // The form sets minLength and marks both boxes required, but a form field
  // is a suggestion, not a constraint — a server action is a public endpoint
  // and can be posted to directly. Checked here before anything is created.
  const passwordProblem = checkPasswordPair(password, confirmation);
  if (passwordProblem) {
    redirect(`/signup?error=${encodeURIComponent(passwordProblem)}&${nextQuery}`);
  }

  // Keyed by IP, not email: repeat signups to the same email just get
  // Supabase's "already registered" error regardless, so what's worth
  // throttling here is scripted mass account creation from one source.
  const allowed = await checkRateLimit(`signup:${(await clientIp())}`, 3, 60 * 60);
  if (!allowed) {
    redirect(`/signup?error=${encodeURIComponent("Too many signups from this network. Try again later.")}&${nextQuery}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      /*
       * Without this, Supabase falls back to the project's Site URL for the
       * confirmation link. That is localhost, so the first real signup got an
       * email whose button pointed at a machine that was not theirs — on a
       * phone it reads as a phishing link.
       *
       * The link lands on our callback, which exchanges the code and then
       * forwards to /auth/confirmed. `next` rides along inside that path so
       * someone who was mid-booking is offered the trip they picked rather
       * than a bare bookings list.
       *
       * Every origin used here must also be listed under Authentication ->
       * URL Configuration -> Redirect URLs in the Supabase dashboard, or the
       * link comes back to the Site URL instead.
       */
      emailRedirectTo: `${getAppUrl()}/auth/callback?type=signup&next=${encodeURIComponent(
        `/auth/confirmed?next=${encodeURIComponent(next)}`
      )}`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}&${nextQuery}`);
  }

  revalidatePath("/", "layout");

  /*
   * Supabase answers a signup for an address that already has an account with
   * 200 and a user object whose `identities` array is empty. It does that on
   * purpose, so the form cannot be used to test whether somebody is a member.
   * The important part is that it sends no email.
   *
   * The old copy here said "Check your email to confirm your account", which
   * stranded anyone in that case waiting on mail that was never going to
   * arrive. The message below is deliberately the same in both cases, so it
   * still gives nothing away, but it now names the other possibility and
   * points at the resend control on the login page.
   */
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    /*
     * Deliberate trade: this tells the visitor plainly that the address is
     * taken, which also tells anyone else that the address has an account.
     * Supabase's silence exists to prevent exactly that, but silence sent a
     * real customer away to wait on an email nobody was ever going to send,
     * which is the worse failure for a company taking deposits. The IP throttle
     * above (3 an hour) is what keeps this from being a bulk membership oracle.
     */
    redirect(
      `/signup?error=${encodeURIComponent(
        "An account already exists for that email. Log in instead, or reset your password if you have forgotten it."
      )}&${nextQuery}`
    );
  }

  // No session yet means the project requires email confirmation before
  // the account can log in.
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Check your email for a confirmation link, then log in. If it does not arrive, you can send it again below."
      )}&${nextQuery}`
    );
  }

  redirect(next);
}

/**
 * Send the confirmation email again.
 *
 * Confirmation mail gets filtered, delayed and deleted, and without this the
 * only route back is creating another account, which cannot work because the
 * address is already taken. Supabase's own rate limits still apply on top of
 * the throttle here.
 *
 * Like the reset flow, the response is identical whether or not the address
 * has an unconfirmed account, so this cannot be used to enumerate members.
 */
export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safePath(formData.get("next"), "/bookings");
  const nextQuery = `next=${encodeURIComponent(next)}`;

  if (!EMAIL_PATTERN.test(email)) {
    redirect(`/login?error=${encodeURIComponent("Enter a valid email address.")}&${nextQuery}`);
  }

  const allowed = await checkRateLimit(`resend:${(await clientIp())}`, 3, 15 * 60);
  if (!allowed) {
    redirect(
      `/login?error=${encodeURIComponent("Too many requests. Try again in a few minutes.")}&${nextQuery}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      // Same destination the original signup used, or the link in the resent
      // mail lands somewhere else entirely.
      emailRedirectTo: `${getAppUrl()}/auth/callback?type=signup&next=${encodeURIComponent(
        `/auth/confirmed?next=${encodeURIComponent(next)}`
      )}`,
    },
  });

  if (error) {
    // Logged, never surfaced: the text would say whether the address exists.
    console.error("Resend confirmation failed:", error.message);
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "If that address has an account waiting to be confirmed, a new link is on its way."
    )}&${nextQuery}`
  );
}

/**
 * Send a reset link.
 *
 * The response is deliberately identical whether or not the address has an
 * account: a form that says "no account with that email" is a free membership
 * oracle, and this list is exactly the kind someone would want to scrape. So
 * Supabase's result is logged server-side and thrown away, and the caller is
 * always redirected to the same confirmation.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  // Keyed by IP rather than by email, unlike login: keying on the address
  // would let an attacker probe one account and watch the limit trip, which
  // is the enumeration signal this whole action exists to avoid. Sending
  // mail also costs us money per attempt, and the abuse is per-source.
  const allowed = await checkRateLimit(`password-reset:${(await clientIp())}`, 5, 60 * 60);
  if (!allowed) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Too many reset requests from this network. Try again later.")}`
    );
  }

  if (EMAIL_PATTERN.test(email)) {
    const supabase = await createClient();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // `type=recovery` is what the callback branches on to send this to
        // the new-password form instead of the bookings list.
        redirectTo: `${getAppUrl()}/auth/callback?type=recovery&next=${encodeURIComponent("/reset-password")}`,
      });
      if (error) {
        // Not surfaced: the message distinguishes "no such user" from a real
        // fault, which is the leak. Rate limits from Supabase land here too.
        console.error(`resetPasswordForEmail failed: ${error.message}`);
      }
    } catch (cause) {
      console.error("resetPasswordForEmail threw", cause);
    }
  }

  redirect("/forgot-password?sent=1");
}

/**
 * Set a new password using the recovery session the callback established.
 *
 * There is no "current password" field because there is no session other than
 * the one the emailed link just created, and Supabase does not ask for one.
 * That is also why this ends in a sign-out: the session came from a link in an
 * inbox, and it should not outlive the change it was for.
 */
export async function resetPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");

  const passwordProblem = checkPasswordPair(password, confirmation);
  if (passwordProblem) {
    redirect(`/reset-password?error=${encodeURIComponent(passwordProblem)}`);
  }

  const supabase = await createClient();

  // getUser revalidates with Supabase rather than trusting the cookie, so an
  // expired or already-spent recovery link fails here rather than inside
  // updateUser with a less useful message.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("That reset link has expired or has already been used. Request a new one.")}`
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");

  redirect(
    `/login?message=${encodeURIComponent("Your password is changed. Log in with the new one.")}`
  );
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
