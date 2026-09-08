import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safePath } from "@/lib/safe-path";

/*
 * Where Supabase sends the browser after a user clicks an emailed link:
 * a signup confirmation, a magic link, or a password recovery link.
 *
 * Two shapes arrive here, because Supabase's email templates support both and
 * the project's templates decide which:
 *
 *   ?code=...                    the PKCE flow, from the default
 *                                {{ .ConfirmationURL }} templates. Exchanging
 *                                it needs the code-verifier cookie, so it only
 *                                works in the browser that started the flow.
 *   ?token_hash=...&type=...     from a {{ .TokenHash }} template. No verifier,
 *                                so it survives being opened on a phone when
 *                                the signup happened on a laptop.
 *
 * Both are handled. Everything after the exchange is the same.
 */

// The link is user-controlled, so `next` is treated the same way the login
// form's is: a same-site relative path or nothing.
// Replaced by the shared guard in lib/safe-path.ts.

// `type` reaches us either from Supabase's own verify redirect or from the
// query we hung on `redirectTo` ourselves. Anything not on this list is
// treated as an ordinary confirmation rather than passed to verifyOtp.
const OTP_TYPES: EmailOtpType[] = ["signup", "recovery", "invite", "magiclink", "email", "email_change"];

function otpType(value: string | null): EmailOtpType | null {
  return OTP_TYPES.includes(value as EmailOtpType) ? (value as EmailOtpType) : null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = otpType(searchParams.get("type"));
  const recovery = type === "recovery";

  /*
   * A recovery link must land on the new-password form, never on the bookings
   * list: the session it just created is a full one, so following `next` would
   * drop someone into their account without them ever setting the password
   * they came here to set. Forced rather than merely defaulted, so a tampered
   * `next` on a recovery link cannot steer it somewhere else.
   */
  const next = recovery ? "/reset-password" : safePath(searchParams.get("next"), "/bookings");

  // Sending a failed recovery back to /login would be a dead end: what that
  // person needs is another link.
  const failure = recovery
    ? `/forgot-password?error=${encodeURIComponent("That reset link has expired or has already been used. Request a new one.")}`
    : `/login?error=${encodeURIComponent("We could not confirm that link. It may have expired. Try again, or log in.")}`;

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${failure}`);
}
