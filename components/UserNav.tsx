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

  return (
    <nav>
      <span>{user.email}</span>{" "}
      <form action={logout} style={{ display: "inline" }}>
        <button type="submit">Log out</button>
      </form>
    </nav>
  );
}
