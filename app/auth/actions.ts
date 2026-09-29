"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, FAIL_CLOSED } from "@/lib/rate-limit";
import { checkPasswordPair } from "@/lib/password";
import { getAppUrl } from "@/lib/site-url";
import { safePath } from "@/lib/safe-path";
import { clientIp } from "@/lib/client-ip";
import { joinListFromSignup } from "@/lib/waitlist-from-signup";

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

// No deliverable address is longer (RFC 5321 caps the path at 254). Checked
// before the pattern, so the regex never backtracks over an arbitrarily long
// string, and before any rate-limit key is built from the address, so junk
// never becomes a row.
const MAX_EMAIL_LENGTH = 254;

function isEmail(email: string): boolean {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safePath(formData.get("next"), "/bookings");

  // Nothing that fails this could sign in anyway, and every distinct string
  // posted here would otherwise mint fresh email-keyed buckets below.
  if (!isEmail(email)) {
    redirect(`/login?error=invalid_email&next=${encodeURIComponent(next)}`);
  }

  /*
   * Three buckets, all on the trimmed, lowercased address so "A@x.com " is not
   * a fresh one. They run one after another, never together: check_rate_limit
   * counts every call, including the ones it refuses, so a bucket checked
   * alongside a tripped one would keep filling for nothing.
   *
   * Per IP, 30 in 15 minutes, first: one source spraying a common password
   * across many accounts, which no email-keyed bucket ever sees. Loose, since a
   * campus or a phone carrier puts many people behind one address. A source
   * that has tripped it stops here and cannot go on writing a new row for
   * every address it cycles through.
   *
   * Per IP and email, 5 in 15 minutes: the strict one. It used to be per email
   * alone, which let a stranger lock a customer out of their own account by
   * failing five times against the address from anywhere. Now those five
   * failures shut out only the stranger's network. IP first in the key because
   * checkRateLimit cuts keys at 200 characters, and a long address must cost
   * its own tail, not the IP that makes this bucket per-source.
   *
   * Per email, 30 in 15 minutes, last: still caps a guess against one account
   * spread across many IPs, where the strict bucket never fills. Only attempts
   * the strict bucket let through reach it, so one source adds at most five a
   * window and cannot fill it alone.
   *
   * All fail closed: a flood that knocks the database over must not be the
   * moment password guessing goes unlimited.
   */
  const ip = await clientIp();
  const allowed =
    (await checkRateLimit(`login-ip:${ip}`, 30, 15 * 60, FAIL_CLOSED)) &&
    (await checkRateLimit(`login:${ip}:${email}`, 5, 15 * 60, FAIL_CLOSED)) &&
    (await checkRateLimit(`login-email:${email}`, 30, 15 * 60, FAIL_CLOSED));
  if (!allowed) {
    redirect(`/login?error=rate_limited&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // A code, never Supabase's own text: the login page shows a fixed sentence
    // for each (lib/flash.ts), so nothing on the URL is ever printed as is.
    const code = /invalid login credentials/i.test(error.message)
      ? "invalid_credentials"
      : /email not confirmed/i.test(error.message)
        ? "email_not_confirmed"
        : "login_failed";
    redirect(`/login?error=${code}&next=${encodeURIComponent(next)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  // Capped to the users_name_length constraint (limit_user_name_phone
  // migration): handle_new_user copies this into public.users, and an over-long
  // name would fail that insert and with it the whole signup.
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  // Normalised the way login is, so the address stored is the one login will
  // look up.
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  // Signup is the other half of the same round trip as login: a visitor sent
  // here from "Reserve your spot" has to land back on the trip they picked,
  // not on a generic booking list. Carried through every redirect below, and
  // sanitised by the same guard login uses.
  const next = safePath(formData.get("next"), "/bookings");
  const nextQuery = `next=${encodeURIComponent(next)}`;

  // Caught here rather than left to Supabase, whose complaint would arrive
  // only after the throttle below had spent one of this network's three
  // signups an hour on a typo.
  if (!isEmail(email)) {
    redirect(`/signup?error=invalid_email&${nextQuery}`);
  }

  // The form sets minLength and marks both boxes required, but a form field
  // is a suggestion, not a constraint — a server action is a public endpoint
  // and can be posted to directly. Checked here before anything is created.
  const passwordProblem = checkPasswordPair(password, confirmation);
  if (passwordProblem) {
    redirect(`/signup?error=${passwordProblem}&${nextQuery}`);
  }

  // Keyed by IP, not email: repeat signups to the same email just get
  // Supabase's "already registered" error regardless, so what's worth
  // throttling here is scripted mass account creation from one source. Fails
  // closed, since every signup that gets past it sends a confirmation email.
  const allowed = await checkRateLimit(`signup:${(await clientIp())}`, 3, 60 * 60, FAIL_CLOSED);
  if (!allowed) {
    redirect(`/signup?error=rate_limited&${nextQuery}`);
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
    // A code, never Supabase's own text (lib/flash.ts). Its length complaint
    // quotes the dashboard minimum, which can be lower than ours, so that one
    // restates our rule instead.
    const code = /already registered|already exists/i.test(error.message)
      ? "account_exists"
      : /password/i.test(error.message) && /at least|weak|short/i.test(error.message)
        ? "weak_password"
        : /invalid|valid email/i.test(error.message)
          ? "invalid_email"
          : "signup_failed";
    if (code === "signup_failed") console.error(`signUp failed: ${error.message}`);
    redirect(`/signup?error=${code}&${nextQuery}`);
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
    redirect(`/signup?error=account_exists&${nextQuery}`);
  }

  // The email opt-in under the password boxes, unticked unless they tick it
  // (lib/waitlist-consent.ts). Here, after the check above, so it only ever
  // runs for an account that was actually created: an address that already
  // had one is not necessarily the person typing it. Awaited, because a
  // serverless function can stop at the redirect, but it never throws.
  if (formData.get("email_updates") === "yes") {
    const ip = await clientIp();
    await joinListFromSignup({
      email,
      name,
      ip: ip === "unknown" ? null : ip,
      userAgent: (await headers()).get("user-agent")?.slice(0, 300) ?? null,
    });
  }

  // No session yet means the project requires email confirmation before
  // the account can log in.
  if (!data.session) {
    redirect(`/login?message=check_email&${nextQuery}`);
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

  if (!isEmail(email)) {
    redirect(`/login?error=invalid_email&${nextQuery}`);
  }

  const allowed = await checkRateLimit(`resend:${(await clientIp())}`, 3, 15 * 60, FAIL_CLOSED);
  if (!allowed) {
    redirect(`/login?error=too_many_requests&${nextQuery}`);
  }

  // Per address too, checked only once the IP bucket has passed so a refused
  // source cannot keep minting rows. The reasoning is the same as the reset
  // flow's (requestPasswordReset, below): it stops one inbox being flooded
  // from many networks, and a tripped bucket skips the send but lands on the
  // same page a real send does, so it says nothing about the address.
  const addressAllowed = await checkRateLimit(`resend-email:${email}`, 3, 60 * 60, FAIL_CLOSED);

  if (addressAllowed) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        // Same destination the original signup used, or the link in the
        // resent mail lands somewhere else entirely.
        emailRedirectTo: `${getAppUrl()}/auth/callback?type=signup&next=${encodeURIComponent(
          `/auth/confirmed?next=${encodeURIComponent(next)}`
        )}`,
      },
    });

    if (error) {
      // Logged, never surfaced: the text would say whether the address exists.
      console.error("Resend confirmation failed:", error.message);
    }
  }

  redirect(`/login?message=confirmation_resent&${nextQuery}`);
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
  // Lowercased like every other action here, so "A@x.com" and "a@x.com" are
  // one bucket below, not two.
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Per IP first: one source working down a list of addresses. Fails closed,
  // since every request past it can send an email.
  const allowed = await checkRateLimit(`password-reset:${(await clientIp())}`, 5, 60 * 60, FAIL_CLOSED);
  if (!allowed) {
    redirect("/forgot-password?error=rate_limited");
  }

  /*
   * Then per address, 3 an hour, which the IP bucket never sees: one victim's
   * inbox flooded with reset mail from many networks. It also guards the auth
   * email quota, which Supabase meters for the whole project across signup,
   * resend and reset, so a flood aimed at one address during launch would
   * otherwise hold up every real customer's confirmation mail too.
   *
   * Keying on the address was once ruled out as an enumeration leak. It is
   * not one: the bucket counts every well-formed address, account or not, and
   * a tripped bucket skips the send but still lands on exactly the page a real
   * send does. Nothing the caller sees depends on membership. The cost is that
   * the real owner, once someone has spent the three, waits out the hour.
   */
  if (isEmail(email) && (await checkRateLimit(`reset-email:${email}`, 3, 60 * 60, FAIL_CLOSED))) {
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
    redirect(`/reset-password?error=${passwordProblem}`);
  }

  const supabase = await createClient();

  // getUser revalidates with Supabase rather than trusting the cookie, so an
  // expired or already-spent recovery link fails here rather than inside
  // updateUser with a less useful message.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=link_expired");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const code = /same|different from the old/i.test(error.message)
      ? "same_password"
      : /at least|weak|short/i.test(error.message)
        ? "password_short"
        : "update_failed";
    if (code === "update_failed") console.error(`updateUser (password) failed: ${error.message}`);
    redirect(`/reset-password?error=${code}`);
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");

  redirect("/login?message=password_changed");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
