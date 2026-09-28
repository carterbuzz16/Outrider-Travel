import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import AccountsView from "./AccountsView";
import { buildAccountRows, filterRows, parseShow, type BookingLite } from "./account-rows";

export const metadata: Metadata = {
  title: "Accounts",
  robots: { index: false, follow: false },
};

// Per request, and never prerendered: see app/admin/page.tsx.
export const dynamic = "force-dynamic";

/*
 * Everyone who has made an account, and how far each got: account only,
 * checkout started, booked.
 *
 * The list is read from auth.users rather than public.users, because only
 * auth knows whether the email was confirmed and when they last signed in.
 * An unconfirmed account cannot book at all (see createBooking), so that is
 * the first thing to know about someone who signed up and stopped.
 * public.users adds the role and the name the signup form saved.
 *
 * Service-role reads, and the role is checked here as well as in the layout,
 * the same as the bookings list.
 */

// Supabase's listUsers maximum. Twenty pages is 20,000 accounts, far past
// anything this page is for; the cap only stops a runaway loop.
const PER_PAGE = 1000;
const MAX_PAGES = 20;

async function allAuthUsers(admin: ReturnType<typeof createAdminClient>): Promise<User[] | null> {
  const users: User[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) {
      console.error(`admin accounts: listUsers page ${page}: ${error.message}`);
      return null;
    }
    users.push(...data.users);
    if (data.users.length < PER_PAGE) break;
  }
  return users;
}

export default async function AdminAccountsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const show = parseShow((await props.searchParams).show);

  const admin = createAdminClient();
  const [authUsers, profiles, bookings, list] = await Promise.all([
    allAuthUsers(admin),
    admin.from("users").select("id, name, role"),
    admin
      .from("bookings")
      .select("id, user_id, status, created_at, trips(name), tiers(name)")
      .order("created_at", { ascending: false }),
    admin.from("waitlist_signups").select("email, unsubscribed_at"),
  ]);

  for (const [label, result] of [
    ["users", profiles],
    ["bookings", bookings],
    ["waitlist_signups", list],
  ] as const) {
    if (result.error) console.error(`admin accounts: ${label}: ${result.error.code} ${result.error.message}`);
  }

  const { rows, listWithoutAccount } = buildAccountRows({
    authUsers: authUsers ?? [],
    profiles: profiles.data ?? [],
    bookings: (bookings.data ?? []) as BookingLite[],
    list: list.data ?? [],
  });

  return (
    <AccountsView
      rows={filterRows(rows, show)}
      all={rows}
      show={show}
      listWithoutAccount={listWithoutAccount}
      loadFailed={authUsers === null || Boolean(profiles.error || bookings.error || list.error)}
    />
  );
}
