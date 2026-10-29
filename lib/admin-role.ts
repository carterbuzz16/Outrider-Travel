/*
 * The admin decision itself, apart from where the client comes from, so the
 * tests can run it against a stand-in (tests/admin-guard.test.ts). lib/admin.ts
 * passes the signed-in user's own Supabase client.
 *
 * Admin means exactly one thing: the user Supabase vouches for (getUser, which
 * revalidates with Supabase rather than trusting the cookie) has role "admin"
 * on their own public.users row. Any error, a missing row or any other role is
 * not an admin.
 */

export type Viewer = { userId: string | null; isAdmin: boolean };

/** The two calls the decision needs, in the shape supabase-js has them. */
export type RoleClient = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  from: (table: "users") => {
    select: (columns: "role") => {
      eq: (column: "id", value: string) => {
        single: () => PromiseLike<{ data: { role: string } | null; error?: unknown }>;
      };
    };
  };
};

export async function viewerFrom(client: RoleClient): Promise<Viewer> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { userId: null, isAdmin: false };

  const { data: profile, error } = await client.from("users").select("role").eq("id", user.id).single();
  return { userId: user.id, isAdmin: !error && profile?.role === "admin" };
}
