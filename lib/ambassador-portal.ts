import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAmbassadors, type Ambassador } from "@/lib/ambassadors";
import { PROGRAMS, TELLURIDE_2026, programFor, type AmbassadorProgram } from "@/lib/ambassador-program";
import {
  TOOLKIT_BUCKET,
  agreedAtFor,
  buildPortalView,
  decideLink,
  isToolkitPathAllowed,
  scopeToProgram,
  statusHasAccess,
  toolkitFolders,
  type AmbassadorAccessRow,
  type AmbassadorAcrossPrograms,
  type PortalAccess,
  type PortalAmbassador,
  type PortalSnapshot,
  type PortalView,
} from "@/lib/ambassador-rules";

/*
 * The ambassador portal's reads (/ambassador/dashboard, 29 October 2026).
 *
 * Every read here starts from the signed-in session, never from anything the
 * request carries: getPortalAccess finds the ambassador row the account is,
 * and everything else is scoped to that row's code. The tables are service
 * role only (ambassadors, discount_codes, discount_redemptions have no grants
 * for anon or authenticated), so this module is the only way to them, and it
 * returns only what the portal shows (lib/ambassador-rules.ts,
 * buildPortalView).
 */

const ACCESS_COLUMNS = "code, name, school, email, user_id, status, program, agreed_at";

type AccessRow = AmbassadorAccessRow & { name: string; school: string | null; agreed_at: string | null };

/**
 * Which programs beyond Telluride this account has agreed to, from
 * legal_acceptances (the same slug, each program's own version; no migration).
 * A failed read comes back as "none": they see the agreement again, and agreeing
 * a second time changes nothing (the unique index), which is a far smaller wrong
 * than locking anyone out of Telluride.
 */
async function loadOtherAgreements(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<Record<string, string>> {
  const others = Object.values(PROGRAMS).filter((p) => p.id !== TELLURIDE_2026.id);
  const { data, error } = await admin
    .from("legal_acceptances")
    .select("document_version, accepted_at")
    .eq("user_id", userId)
    .eq("document_slug", TELLURIDE_2026.agreement.slug)
    .in("document_version", others.map((p) => p.agreement.version));
  if (error) {
    console.error(`loadOtherAgreements: ${error.code} ${error.message}`);
    return {};
  }
  const accepted: Record<string, string> = {};
  for (const program of others) {
    const row = (data ?? []).find((r) => r.document_version === program.agreement.version);
    if (row?.accepted_at) accepted[program.id] = row.accepted_at;
  }
  return accepted;
}

/**
 * Who is signed in, and which ambassador they are. Memoized per request, so
 * the layout, the page and an action share one answer. Throws if the
 * ambassadors table cannot be read.
 *
 * On an account's first visit it is linked to the ambassador row whose email
 * is exactly its own, but only once Supabase has confirmed that address (the
 * emailed sign-in code does), and only onto a row no other account holds
 * (decideLink). The update is conditional on the row still being unlinked, so
 * two accounts racing for one row cannot both win.
 */
export const getPortalAccess = cache(async (): Promise<PortalAccess> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "signed-out" };

  const admin = createAdminClient();
  const { data: linked, error } = await admin
    .from("ambassadors")
    .select(ACCESS_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  // A failed read is not an answer: telling a real ambassador "this portal
  // isn't for you" because the database blinked would be wrong. The page
  // shows the app's error screen; the polling endpoint answers 503.
  if (error) throw new Error(`getPortalAccess: ${error.code} ${error.message}`);

  let row: AccessRow | null = linked;
  const email = user.email?.trim().toLowerCase() ?? "";
  if (!row && email && user.email_confirmed_at) {
    const { data: candidates } = await admin.from("ambassadors").select(ACCESS_COLUMNS).eq("email", email);
    const decision = decideLink(
      { id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at },
      candidates ?? [],
    );
    if (decision.link) {
      const { data: claimed, error: linkError } = await admin
        .from("ambassadors")
        .update({ user_id: user.id, updated_at: new Date().toISOString() })
        .eq("code", decision.code)
        .is("user_id", null)
        .select(ACCESS_COLUMNS)
        .maybeSingle();
      if (linkError) console.error(`getPortalAccess: linking ${decision.code}: ${linkError.code} ${linkError.message}`);
      row = claimed ?? null;
    } else if (decision.reason === "ambiguous" || decision.reason === "taken") {
      console.error(`getPortalAccess: not linking ${user.id}: ${decision.reason}`);
    }
  }

  if (!row || !statusHasAccess(row.status, programFor(row.program))) {
    return { kind: "not-ambassador", email: user.email ?? null };
  }
  return {
    kind: "ambassador",
    userId: user.id,
    ambassador: {
      code: row.code,
      name: row.name,
      school: row.school,
      status: row.status,
      program: row.program,
      agreedAt: row.agreed_at,
      agreements: await loadOtherAgreements(admin, user.id),
    },
  };
});

/**
 * Whether a signed-in account is an ambassador, for the links that lead to
 * the portal (the account nav, the bookings page). Linked by user_id, or not
 * yet linked but with a confirmed email that matches, exactly as the portal
 * itself decides (getPortalAccess). Dropped and code-only ambassadors are not. Never throws:
 * a link is a convenience, and the portal checks again on arrival.
 */
export async function isAmbassadorAccount(user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const email = user.email?.trim().toLowerCase();
    const [byId, byEmail] = await Promise.all([
      admin.from("ambassadors").select("status, program").eq("user_id", user.id).maybeSingle(),
      email && user.email_confirmed_at
        ? admin.from("ambassadors").select("status, program").eq("email", email).is("user_id", null).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const row = byId.data ?? byEmail.data;
    return Boolean(row && statusHasAccess(row.status, programFor(row.program)));
  } catch (err) {
    console.error(`isAmbassadorAccount: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/** An ambassador across every program. Traveler names only, never an email in their place. */
function forView(a: Ambassador): AmbassadorAcrossPrograms {
  return {
    code: a.code,
    name: a.name,
    school: a.school,
    status: a.status,
    leaderboardHidden: a.leaderboardHidden,
    holdStatus: a.holdStatus,
    rewardTripStart: a.rewardTrip?.start_date ?? null,
    rewardClaimedAt: a.rewardClaimedAt,
    bookings: a.bookings.map((b) => ({
      status: b.status,
      // lib/ambassadors.ts falls back to the email when an account has no
      // name, for the admin table. The portal shows "A friend" instead.
      traveler: b.email !== null && b.traveler === b.email ? "" : b.traveler,
      tripStart: b.tripStart,
      programId: b.programId,
      counts: b.counts,
      depositOnly: b.depositOnly,
      note: b.note,
    })),
  };
}

/**
 * What one program shows `code`: their counts and friends, its leaderboard and
 * their rewards. Null when the data cannot be read. The caller passes the code
 * from getPortalAccess, never one from the request.
 */
export async function loadPortalView(code: string, program: AmbassadorProgram): Promise<PortalView | null> {
  const all = await loadAmbassadors(createAdminClient());
  if (!all) return null;
  return buildPortalView(code, all.map((a) => scopeToProgram(forView(a), program)), program);
}

/**
 * A view for each program this ambassador has agreed to, and nothing about one
 * they haven't: agreeing comes first, program by program. Null when the data
 * cannot be read, or there is nothing they have agreed to yet. Takes the
 * ambassador from getPortalAccess, never anything from the request.
 */
export async function loadPortalSnapshot(ambassador: PortalAmbassador): Promise<PortalSnapshot | null> {
  const agreed = Object.values(PROGRAMS).filter((p) => agreedAtFor(ambassador, p));
  if (agreed.length === 0) return null;
  const all = await loadAmbassadors(createAdminClient());
  if (!all) return null;
  const rows = all.map(forView);
  const programs: Record<string, PortalView> = {};
  for (const program of agreed) {
    const view = buildPortalView(ambassador.code, rows.map((r) => scopeToProgram(r, program)), program);
    if (view) programs[program.id] = view;
  }
  const first = programs[agreed[0].id];
  return first ? { ...first, programs } : null;
}

export type Announcement = { body: string; createdAt: string };

/** The newest published announcement, or null. */
export async function loadAnnouncement(): Promise<Announcement | null> {
  const { data, error } = await createAdminClient()
    .from("ambassador_announcements")
    .select("body, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(`loadAnnouncement: ${error.code} ${error.message}`);
    return null;
  }
  return data ? { body: data.body, createdAt: data.created_at } : null;
}

export type ToolkitFile = { path: string; label: string; folder: "shared" | "school" };

/** "story-1-tcu.png" reads as "Story 1 tcu". */
function fileLabel(name: string): string {
  const base = name.replace(/\.[a-z]+$/, "").replace(/-/g, " ");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** The graphics this ambassador may open: the shared folder and their school's. */
export async function listToolkit(school: string | null): Promise<ToolkitFile[]> {
  const storage = createAdminClient().storage.from(TOOLKIT_BUCKET);
  const folders = toolkitFolders(school);
  const lists = await Promise.all(
    folders.map(async (folder) => {
      const { data, error } = await storage.list(folder, { limit: 100, sortBy: { column: "name", order: "asc" } });
      if (error) {
        console.error(`listToolkit(${folder}): ${error.message}`);
        return [];
      }
      return (data ?? [])
        .map((f) => `${folder}/${f.name}`)
        .filter((path) => isToolkitPathAllowed(path, school))
        .map((path): ToolkitFile => ({
          path,
          label: fileLabel(path.slice(path.lastIndexOf("/") + 1)),
          folder: folder === "shared" ? "shared" : "school",
        }));
    }),
  );
  // Their school's own graphics first.
  return lists.flat().sort((a, b) => (a.folder === b.folder ? 0 : a.folder === "school" ? -1 : 1));
}

/** How long a toolkit link works. The page links to a route that makes a fresh one per click. */
export const TOOLKIT_URL_SECONDS = 60;

/**
 * A short-lived signed URL for one toolkit file, if this ambassador's school
 * may open it (isToolkitPathAllowed); null otherwise or on any failure.
 */
export async function signToolkitFile(path: string, school: string | null, download: boolean): Promise<string | null> {
  if (!isToolkitPathAllowed(path, school)) return null;
  const { data, error } = await createAdminClient()
    .storage.from(TOOLKIT_BUCKET)
    .createSignedUrl(path, TOOLKIT_URL_SECONDS, download ? { download: path.slice(path.lastIndexOf("/") + 1) } : undefined);
  if (error || !data?.signedUrl) {
    if (error) console.error(`signToolkitFile: ${error.message}`);
    return null;
  }
  return data.signedUrl;
}
