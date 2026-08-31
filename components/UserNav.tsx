import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function UserNav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <nav>
        <Link href="/login">Log in</Link> · <Link href="/signup">Sign up</Link>
      </nav>
    );
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  return (
    <nav>
      <Link href="/bookings">Your bookings</Link>{" "}
      {profile?.role === "admin" && (
        <>
          · <Link href="/admin">Admin</Link>{" "}
        </>
      )}
      · <span>{user.email}</span>{" "}
      <form action={logout} style={{ display: "inline" }}>
        <button type="submit">Log out</button>
      </form>
    </nav>
  );
}
