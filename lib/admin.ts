import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { viewerFrom, type RoleClient, type Viewer } from "@/lib/admin-role";

/*
 * The back office's one role check.
 *
 * app/admin/layout.tsx gates every admin page with it, but a layout is not a
 * security boundary on its own: server actions are POST endpoints and route
 * handlers (the CSV exports) never render the layout at all. So every page,
 * action and route handler that shows or changes booking data calls this
 * again itself.
 *
 * The role is read from public.users through the signed-in user's own
 * Supabase client, relying on the "Users can view own profile" RLS policy.
 * No service-role key is involved in deciding who is an admin. The decision
 * is lib/admin-role.ts, kept apart so it can be tested.
 */

async function readViewer(): Promise<Viewer> {
  return viewerFrom((await createClient()) as unknown as RoleClient);
}

/** The signed-in admin's user id, or null for anyone else (signed out, or not an admin). */
export async function getAdminUserId(): Promise<string | null> {
  const viewer = await readViewer();
  return viewer.isAdmin ? viewer.userId : null;
}

/**
 * For pages and server actions: the admin's user id, or a redirect away.
 * Signed out goes to /login; signed in without the role goes to their own
 * bookings, the same as the layout has always done.
 */
export async function requireAdmin(): Promise<string> {
  const viewer = await readViewer();
  if (!viewer.userId) redirect("/login");
  if (!viewer.isAdmin) redirect("/bookings");
  return viewer.userId;
}
