import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserNav from "@/components/UserNav";

// Admin routes require both a logged-in user and role = 'admin'. The role
// check reads public.users through the signed-in user's own Supabase
// client, relying on the "Users can view own profile" RLS policy — no
// service-role key needed for this.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/bookings");
  }

  return (
    <>
      <UserNav />
      {children}
    </>
  );
}
