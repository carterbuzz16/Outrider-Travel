import type { User } from "@supabase/supabase-js";

/*
 * Turns the four reads behind /admin/accounts into rows. Pure, with no
 * Supabase client in it, so page.tsx does the reading and this can be run
 * against real data outside Next.
 */

export type Stage = "booked" | "checkout" | "cancelled" | "account";
export type Show = "all" | "not-booked" | "booked";

export type AccountRow = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  createdAt: string;
  confirmed: boolean;
  lastSignIn: string | null;
  list: "yes" | "no" | "unsubscribed";
  stage: Stage;
  /** Trip and package of the booking that set the stage. */
  detail: string | null;
  bookingCount: number;
};

export type BookingLite = {
  id: string;
  user_id: string;
  status: "pending" | "deposit_paid" | "paid_in_full" | "cancelled";
  created_at: string;
  trips: { name: string } | null;
  tiers: { name: string } | null;
};

type Profile = { id: string; name: string | null; role: "customer" | "admin" };
type Signup = { email: string; unsubscribed_at: string | null };

const SHOWS: Show[] = ["all", "not-booked", "booked"];

export function parseShow(raw: string | string[] | undefined): Show {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return SHOWS.includes(value as Show) ? (value as Show) : "all";
}

export function buildAccountRows(input: {
  authUsers: User[];
  profiles: Profile[];
  bookings: BookingLite[];
  list: Signup[];
}): { rows: AccountRow[]; listWithoutAccount: number } {
  const profileById = new Map(input.profiles.map((p) => [p.id, p]));
  const bookingsByUser = new Map<string, BookingLite[]>();
  for (const b of input.bookings) {
    const mine = bookingsByUser.get(b.user_id) ?? [];
    mine.push(b);
    bookingsByUser.set(b.user_id, mine);
  }
  // Keyed lower-case: the list stores what the form sent, auth stores what
  // signup sent, and the same person can type their address two ways.
  const listByEmail = new Map(input.list.map((w) => [w.email.toLowerCase(), w]));

  const rows: AccountRow[] = input.authUsers
    .map((user) => {
      const email = user.email ?? "";
      const profile = profileById.get(user.id);
      const metaName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "";
      const signup = email ? listByEmail.get(email.toLowerCase()) : undefined;
      return {
        id: user.id,
        email,
        name: profile?.name?.trim() || metaName || null,
        isAdmin: profile?.role === "admin",
        createdAt: user.created_at,
        confirmed: Boolean(user.email_confirmed_at),
        lastSignIn: user.last_sign_in_at ?? null,
        list: signup ? (signup.unsubscribed_at ? "unsubscribed" : "yes") : "no",
        ...furthest(bookingsByUser.get(user.id) ?? []),
      } satisfies AccountRow;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const accountEmails = new Set(rows.map((r) => r.email.toLowerCase()));
  const listWithoutAccount = input.list.filter(
    (w) => !w.unsubscribed_at && !accountEmails.has(w.email.toLowerCase()),
  ).length;

  return { rows, listWithoutAccount };
}

export function filterRows(rows: AccountRow[], show: Show): AccountRow[] {
  if (show === "booked") return rows.filter((r) => r.stage === "booked");
  if (show === "not-booked") return rows.filter((r) => r.stage !== "booked");
  return rows;
}

/**
 * The furthest anyone has got, over all their bookings. A live booking beats
 * an open checkout, which beats a cancelled one, so someone who cancelled and
 * then rebooked reads as booked.
 */
function furthest(bookings: BookingLite[]): Pick<AccountRow, "stage" | "detail" | "bookingCount"> {
  const describe = (b: BookingLite) => [b.trips?.name, b.tiers?.name].filter(Boolean).join(", ") || null;
  const pick = (statuses: BookingLite["status"][]) => bookings.find((b) => statuses.includes(b.status));

  const live = pick(["deposit_paid", "paid_in_full"]);
  if (live) return { stage: "booked", detail: describe(live), bookingCount: bookings.length };
  const open = pick(["pending"]);
  if (open) return { stage: "checkout", detail: describe(open), bookingCount: bookings.length };
  const gone = pick(["cancelled"]);
  if (gone) return { stage: "cancelled", detail: describe(gone), bookingCount: bookings.length };
  return { stage: "account", detail: null, bookingCount: 0 };
}
