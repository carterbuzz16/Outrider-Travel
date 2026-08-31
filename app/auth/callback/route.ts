import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where Supabase sends the browser after a user clicks an email
// confirmation / magic link, carrying a one-time `code` to exchange for a
// real session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/bookings";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
