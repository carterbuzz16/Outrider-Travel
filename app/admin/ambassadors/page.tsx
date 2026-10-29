import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Input, Select, Textarea } from "@/components/ui";
import CopyLinkButton from "@/components/CopyLinkButton";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAmount } from "@/lib/balance";
import { formatDay } from "@/app/(protected)/dates";
import { CHECKOUT_SANDBOX, isTestTrip } from "@/lib/booking-window";
import {
  AMBASSADOR_GOAL,
  AMBASSADOR_STATUS_LABEL,
  HOLD_STATUS_LABEL,
  loadAmbassadors,
  loadOldScheduleBookings,
  referralPath,
  type Ambassador,
  type AmbassadorStatus,
} from "@/lib/ambassadors";
import { ANNOUNCEMENT_MAX, TOOLKIT_BUCKET, TOOLKIT_SHARED, schoolSlug } from "@/lib/ambassador-rules";
import { programFor } from "@/lib/ambassador-program";
import { isToolkitObjectPath, MAX_UPLOAD_BYTES } from "@/lib/toolkit-upload";
import {
  LAST_SIGNUP_DEADLINE_DAY,
  LAST_SIGNUP_DEADLINE_LABEL,
  SIGNUP_DEADLINE_LABEL,
  signupsClosed,
} from "@/lib/signup-deadline";
import {
  AdminField,
  EmptyState,
  PageHeader,
  Panel,
  Table,
  TableScroll,
  Td,
  Th,
} from "@/app/admin/admin-ui";
import {
  createHold,
  deleteToolkitFile,
  moveToNewSchedule,
  postAnnouncement,
  releaseUnpaidHolds,
  saveAmbassador,
  setAnnouncementPublished,
  settleHolds,
} from "./actions";
import AmbassadorFields from "./AmbassadorFields";
import { AMBASSADOR_ERRORS, ambassadorDone } from "./flash";

export const metadata: Metadata = {
  title: "Ambassadors",
  robots: { index: false, follow: false },
};

// Per request: the counts move with every payment.
export const dynamic = "force-dynamic";

/**
 * Every ambassador, what they have brought in, and their held spot
 * (lib/ambassadors.ts has the counting rule). One row each; the name opens
 * their bookings. Below the table: settling the held spots at the deadline,
 * adding an ambassador, and the December bookings still on the old schedule.
 */
export default async function AmbassadorsPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await props.searchParams;
  const admin = createAdminClient();
  const [ambassadors, oldSchedule, { data: tripRows }, lastSignIn, { data: announcements }] = await Promise.all([
    loadAmbassadors(admin),
    loadOldScheduleBookings(admin),
    admin.from("trips").select("id, name, start_date").eq("status", "published").order("start_date"),
    loadLastSignIns(admin),
    admin
      .from("ambassador_announcements")
      .select("id, body, created_at, published")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  // Every school with an ambassador gets a folder to upload into.
  const schools = [...new Map(
    (ambassadors ?? [])
      .map((a) => [schoolSlug(a.school), a.school] as const)
      .filter((pair): pair is readonly [string, string] => pair[0] !== null && pair[1] !== null),
  ).entries()].sort((x, y) => x[1].localeCompare(y[1]));
  const toolkit = await loadToolkitFiles(admin, schools.map(([slug]) => slug));
  const trips = (tripRows ?? []).filter((t) => CHECKOUT_SANDBOX || !isTestTrip(t.name));
  const done = ambassadorDone(params);
  const error = params.error ? (AMBASSADOR_ERRORS[params.error] ?? "That didn't go through.") : null;
  const closed = signupsClosed();
  const holds = (ambassadors ?? []).filter((a) => a.holdStatus === "held" || a.holdStatus === "paying");

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Back office"
        title="Ambassadors"
        lede={`A booking counts toward an ambassador's ${AMBASSADOR_GOAL} once it carries their code and is paid in full by the end of ${countByWords()}, Central. Cancelled and refunded bookings, held spots and test bookings never count. Ambassadors see the same count at /ambassador/dashboard.`}
        back={{ href: "/admin", label: "Overview" }}
        actions={
          <Button href="/admin/ambassadors/export" variant="secondary" size="sm">
            Export CSV
          </Button>
        }
      />

      {(done || error) && (
        <p
          role={error ? "alert" : "status"}
          className={
            error
              ? "mt-6 border border-[--flag] px-4 py-3 font-body text-body-s text-[--flag-ink]"
              : "mt-6 border border-[--rule] bg-[--surface-raised] px-4 py-3 font-body text-body-s text-[--text]"
          }
        >
          {error ?? done}
        </p>
      )}

      <div className="mt-8">
        {ambassadors === null ? (
          <EmptyState title="Ambassadors couldn't load">
            The ambassadors table may not exist yet. Run the referrals_and_ambassadors migration in Supabase, then
            reload.
          </EmptyState>
        ) : ambassadors.length === 0 ? (
          <EmptyState title="No ambassadors yet">Add the first one below. Their $0 code is made with them.</EmptyState>
        ) : (
          <Panel title={`${ambassadors.length} ambassadors`} bleed>
            <TableScroll label="Ambassadors">
              <Table>
                <thead>
                  <tr>
                    <Th>Ambassador</Th>
                    <Th>Code and link</Th>
                    <Th>Status</Th>
                    <Th>Portal</Th>
                    <Th>Trip</Th>
                    <Th align="right">Deposit only</Th>
                    <Th align="right">Paid in full</Th>
                    <Th align="right">To {AMBASSADOR_GOAL}</Th>
                    <Th>Held spot</Th>
                  </tr>
                </thead>
                <tbody>
                  {ambassadors.map((a) => (
                    <AmbassadorRow key={a.code} a={a} lastSignIn={a.userId ? (lastSignIn.get(a.userId) ?? null) : null} />
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          </Panel>
        )}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Panel
          title="Settle held spots"
          description={`For each held spot: ${AMBASSADOR_GOAL} or more paid in full by the deadline makes it free. Anyone short is emailed a Stripe link to pay for it by the date below, and the link shows on their row to text as well. Safe to run again: links are never sent twice, and anyone who reaches ${AMBASSADOR_GOAL} later is made free.`}
        >
          <p className="font-body text-body-s text-[--text-secondary]">
            {holds.length === 0
              ? "No spots are held right now."
              : `${holds.length} held ${holds.length === 1 ? "spot" : "spots"} to settle.`}{" "}
            {!closed && `Counts can still change until the end of ${LAST_SIGNUP_DEADLINE_LABEL}.`}
          </p>
          <form action={settleHolds} className="mt-4 flex flex-wrap items-end gap-3">
            <AdminField label="Pay by" htmlFor="pay_by">
              <Input id="pay_by" name="pay_by" type="date" defaultValue={LAST_SIGNUP_DEADLINE_DAY} className="py-2" />
            </AdminField>
            <Button type="submit" variant="primary" size="sm">
              Settle held spots
            </Button>
          </form>
          <form action={releaseUnpaidHolds} className="mt-6 border-t border-[--rule] pt-5">
            <p className="font-body text-body-s text-[--text-secondary]">
              Once the pay-by date has passed: cancels every held spot whose link wasn&rsquo;t paid and switches the
              link off. A spot with part of its price paid is left for you.
            </p>
            <Button type="submit" variant="secondary" size="sm" className="mt-3" disabled={!closed}>
              Release unpaid spots
            </Button>
            {!closed && (
              <p className="mt-2 font-body text-body-s text-[--text-muted]">
                Available after the last booking close, {LAST_SIGNUP_DEADLINE_LABEL}.
              </p>
            )}
          </form>
        </Panel>

        <Panel title="Add an ambassador" description="Makes their $0 code too, expiring at the signup deadline.">
          <form action={saveAmbassador} className="grid gap-4 sm:grid-cols-2">
            <AmbassadorFields trips={trips} />
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" size="sm">
                Add ambassador
              </Button>
            </div>
          </form>
        </Panel>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Panel
          title="Announcements"
          description="The newest published one sits at the top of every ambassador's dashboard. Plain text, up to 600 characters."
        >
          <form action={postAnnouncement} className="flex flex-col gap-3">
            <AdminField label="Announcement" htmlFor="announcement">
              <Textarea id="announcement" name="body" required maxLength={ANNOUNCEMENT_MAX} rows={3} />
            </AdminField>
            <div>
              <Button type="submit" variant="primary" size="sm">
                Post
              </Button>
            </div>
          </form>
          {(announcements ?? []).length > 0 && (
            <ul className="mt-6 flex flex-col gap-3">
              {(announcements ?? []).map((n) => (
                <li key={n.id} className="border-t border-[--rule] pt-3">
                  {/* Rendered as text, never as markup. */}
                  <p className="whitespace-pre-line font-body text-body-s text-[--text]">{n.body}</p>
                  <form action={setAnnouncementPublished} className="mt-2 flex items-center gap-3">
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="published" value={n.published ? "no" : "yes"} />
                    <span className="font-body text-body-s text-[--text-secondary]">
                      {formatDay(n.created_at.slice(0, 10))}, {n.published ? "published" : "hidden"}
                    </span>
                    <Button type="submit" variant="ghost" size="sm">
                      {n.published ? "Hide" : "Publish"}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div id="toolkit" className="scroll-mt-24">
          <Panel
            title="Toolkit graphics"
            description="Story graphics for the ambassador toolkit. Shared shows to everyone; a school's folder shows only to that school's ambassadors. PNG, JPG or WebP, under 4 MB each."
          >
            <form
              action="/admin/ambassadors/toolkit"
              method="post"
              encType="multipart/form-data"
              className="flex flex-wrap items-end gap-3"
            >
              <AdminField label="Folder" htmlFor="toolkit_folder">
                <Select id="toolkit_folder" name="folder" defaultValue={TOOLKIT_SHARED} className="py-2">
                  <option value={TOOLKIT_SHARED}>Shared, every school</option>
                  {schools.map(([slug, name]) => (
                    <option key={slug} value={`schools/${slug}`}>
                      {name}
                    </option>
                  ))}
                </Select>
              </AdminField>
              <AdminField label="Image" htmlFor="toolkit_file">
                <Input
                  id="toolkit_file"
                  name="file"
                  type="file"
                  required
                  accept="image/png,image/jpeg,image/webp"
                  data-max-bytes={MAX_UPLOAD_BYTES}
                  className="py-2"
                />
              </AdminField>
              <Button type="submit" variant="primary" size="sm">
                Upload
              </Button>
            </form>
            {toolkit.length === 0 ? (
              <p className="mt-5 font-body text-body-s text-[--text-secondary]">No graphics yet.</p>
            ) : (
              <ul className="mt-5 flex flex-col gap-1">
                {toolkit.map((path) => (
                  <li key={path} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-body text-body-s text-[--text]">{path}</span>
                    <form action={deleteToolkitFile}>
                      <input type="hidden" name="path" value={path} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remove
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-10">
        <Panel
          title="December bookings on the old schedule"
          description={`Booked before the change, so they still pay on Nov 10 and Dec 1. Move one to a single payment on ${SIGNUP_DEADLINE_LABEL} only once the traveler has agreed.`}
          bleed={oldSchedule.length > 0}
        >
          {oldSchedule.length === 0 ? (
            <p className="font-body text-body-s text-[--text-secondary]">None. Every December booking is on the new schedule.</p>
          ) : (
            <TableScroll label="December bookings on the old schedule">
              <Table>
                <thead>
                  <tr>
                    <Th>Traveler</Th>
                    <Th>Package</Th>
                    <Th>Still scheduled</Th>
                    <Th>
                      <span className="sr-only">Move</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {oldSchedule.map((b) => (
                    <tr key={b.id}>
                      <Td>
                        <Link href={`/admin/bookings/${b.id}`} className="text-[--text] underline underline-offset-4">
                          {b.traveler}
                        </Link>
                        {b.email && <span className="block text-[--text-secondary]">{b.email}</span>}
                      </Td>
                      <Td>{b.packageName}</Td>
                      <Td>{b.scheduled.map((p) => `${formatAmount(p.amount)} on ${formatDay(p.date)}`).join(", ")}</Td>
                      <Td align="right">
                        <form action={moveToNewSchedule}>
                          <input type="hidden" name="booking_id" value={b.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            Move to {SIGNUP_DEADLINE_LABEL}
                          </Button>
                        </form>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </main>
  );
}

/** "November 14 (December), December 4 (January)", from the program config. */
function countByWords(): string {
  const parts = Object.values(programFor(null).departures).map((d) => `${d.countByLabel} (${d.label})`);
  return parts.length > 0 ? parts.join(", ") : SIGNUP_DEADLINE_LABEL;
}

/** When each linked portal account last signed in, by user id. One call: the accounts are few. */
async function loadLastSignIns(admin: ReturnType<typeof createAdminClient>): Promise<Map<string, string | null>> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error(`loadLastSignIns: ${error.message}`);
    return new Map();
  }
  return new Map(data.users.map((u) => [u.id, u.last_sign_in_at ?? null]));
}

/** Every graphic in the toolkit bucket: shared/, then each school's folder. */
async function loadToolkitFiles(admin: ReturnType<typeof createAdminClient>, slugs: string[]): Promise<string[]> {
  const storage = admin.storage.from(TOOLKIT_BUCKET);
  const folders = [TOOLKIT_SHARED, ...slugs.map((s) => `schools/${s}`)];
  const lists = await Promise.all(
    folders.map(async (folder) => {
      const { data, error } = await storage.list(folder, { limit: 100, sortBy: { column: "name", order: "asc" } });
      if (error) return [];
      return (data ?? []).map((f) => `${folder}/${f.name}`).filter((p) => isToolkitObjectPath(p));
    }),
  );
  return lists.flat();
}

function AmbassadorRow({ a, lastSignIn }: { a: Ambassador; lastSignIn: string | null }) {
  const reached = a.toGoal === 0;
  return (
    <tr>
      <Td>
        <Link href={`/admin/ambassadors/${a.code}`} className="font-medium text-[--text] underline underline-offset-4">
          {a.name}
        </Link>
        {a.school && <span className="block text-[--text-secondary]">{a.school}</span>}
      </Td>
      <Td>
        <span className="block font-medium">{a.code}</span>
        <CopyLinkButton
          path={referralPath(a.code, programFor(a.program))}
          label="Copy link"
          className="mt-1.5 min-h-9 px-3"
        />
      </Td>
      <Td>
        {AMBASSADOR_STATUS_LABEL[a.status as AmbassadorStatus] ?? a.status}
        {a.chapter && <span className="block text-[--text-secondary]">{a.chapter}</span>}
      </Td>
      <Td>
        {!a.email ? (
          <span className="text-[--text-muted]">No email</span>
        ) : !a.userId ? (
          <span className="text-[--text-secondary]">Not signed in</span>
        ) : (
          <span className="flex flex-col">
            <span>{a.agreedAt ? `Agreed ${formatDay(a.agreedAt.slice(0, 10))}` : "Not agreed"}</span>
            <span className="text-[--text-secondary]">
              {lastSignIn ? `Last in ${formatDay(lastSignIn.slice(0, 10))}` : "Linked"}
            </span>
          </span>
        )}
        {a.rewardClaimedAt && a.rewardTrip && (
          <span className="block text-[--text-secondary]">Free trip: {formatDay(a.rewardTrip.start_date)}</span>
        )}
      </Td>
      <Td>{a.trip ? formatDay(a.trip.start_date) : <span className="text-[--text-muted]">Not set</span>}</Td>
      <Td align="right">{a.depositOnly}</Td>
      <Td align="right">{a.paidInFull}</Td>
      <Td align="right">{reached ? <Badge tone="open">Reached</Badge> : a.toGoal}</Td>
      <Td>
        <HoldCell a={a} />
      </Td>
    </tr>
  );
}

function HoldCell({ a }: { a: Ambassador }) {
  if (!a.holdStatus) {
    return (
      <form action={createHold}>
        <input type="hidden" name="code" value={a.code} />
        <Button type="submit" variant="ghost" size="sm" disabled={!a.email || !a.trip}>
          Hold a spot
        </Button>
        {(!a.email || !a.trip) && (
          <span className="mt-1 block text-[--text-muted]">Needs {!a.email ? "an email" : "a trip"} first</span>
        )}
      </form>
    );
  }
  const paid = a.hold?.status === "paid_in_full" && a.holdStatus === "paying";
  return (
    <span className="flex flex-col gap-1">
      <span>{paid ? "Paid" : HOLD_STATUS_LABEL[a.holdStatus]}</span>
      {a.holdStatus === "paying" && !paid && a.paymentLinkUrl && (
        <a href={a.paymentLinkUrl} className="text-[--accent] underline underline-offset-4" target="_blank" rel="noreferrer">
          Payment link
        </a>
      )}
      {a.hold && a.hold.remainingCents > 0 && a.holdStatus !== "released" && (
        <span className="text-[--text-secondary]">{formatAmount(a.hold.remainingCents / 100)} owed</span>
      )}
    </span>
  );
}
