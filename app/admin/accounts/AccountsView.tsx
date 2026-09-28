import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui";
import { EmptyState, Figure, PageHeader, Panel, Table, TableScroll, Td, Th } from "@/app/admin/admin-ui";
import { Missing, YesNo, linkClass } from "../bookings/bits";
import { formatShortStamp, formatStamp } from "../bookings/format";
import type { AccountRow, Show, Stage } from "./account-rows";

/**
 * The accounts list, with no data access in it (page.tsx loads).
 *
 * Built for one question: who signed up and stopped, so the owner knows whom
 * to message. The quick views are plain links (?show=), so a view is
 * bookmarkable and nothing hydrates. A table from md up, cards on a phone,
 * the same split as the bookings list.
 */

const STAGE_META: Record<Stage, { tone: BadgeTone; label: string }> = {
  booked: { tone: "open", label: "Booked" },
  // The one actionable state, so it gets the urgent tone the bookings list
  // gives an unpaid checkout.
  checkout: { tone: "urgent", label: "Checkout started" },
  cancelled: { tone: "closed", label: "Cancelled" },
  account: { tone: "neutral", label: "Account only" },
};

export default function AccountsView({
  rows,
  all,
  show,
  listWithoutAccount,
  loadFailed,
}: {
  rows: AccountRow[];
  all: AccountRow[];
  show: Show;
  listWithoutAccount: number;
  loadFailed: boolean;
}) {
  const count = (stage: Stage) => all.filter((r) => r.stage === stage).length;
  const unconfirmed = all.filter((r) => !r.confirmed && r.stage === "account").length;
  const notBooked = all.filter((r) => r.stage !== "booked").length;

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Back office"
        title="Accounts"
        lede="Everyone who has made an account, newest first, and how far they got. Times are Mountain."
        back={{ href: "/admin", label: "Overview" }}
      />

      {loadFailed && (
        <p role="alert" className="mt-6 border border-[--flag] px-4 py-3 font-body text-body-s text-[--flag-ink]">
          Some of this could not be loaded, so the list may be incomplete. Reload to try again.
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
        <Figure label="Accounts" value={all.length} />
        <Figure label="Booked" value={count("booked")} href="/admin/accounts?show=booked" />
        <Figure
          label="Checkout started"
          value={count("checkout")}
          note={count("checkout") > 0 ? "Started, not paid" : undefined}
        />
        <Figure
          label="Account only"
          value={count("account")}
          note={unconfirmed > 0 ? `${unconfirmed} haven't confirmed their email` : undefined}
        />
      </div>

      {listWithoutAccount > 0 && (
        <p className="mt-6 font-body text-body-s text-[--text-secondary]">
          {listWithoutAccount} {listWithoutAccount === 1 ? "person" : "people"} on the waitlist{" "}
          {listWithoutAccount === 1 ? "hasn't" : "haven't"} made an account yet.{" "}
          <Link href="/admin/launch" className={linkClass}>
            Waitlist
          </Link>
        </p>
      )}

      <nav aria-label="Quick views" className="mt-6 flex flex-wrap gap-2">
        <QuickLink href="/admin/accounts" active={show === "all"}>
          All ({all.length})
        </QuickLink>
        <QuickLink href="/admin/accounts?show=not-booked" active={show === "not-booked"}>
          Not booked yet ({notBooked})
        </QuickLink>
        <QuickLink href="/admin/accounts?show=booked" active={show === "booked"}>
          Booked ({count("booked")})
        </QuickLink>
      </nav>

      <div className="mt-6">
        <Panel
          title={show === "booked" ? "Booked" : show === "not-booked" ? "Not booked yet" : "All accounts"}
          description={`${rows.length} of ${all.length} account${all.length === 1 ? "" : "s"}.`}
          bleed
        >
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={show === "all" ? "No accounts yet" : "Nobody here"}>
                {show === "all"
                  ? "Accounts appear here the moment someone signs up, before they confirm their email."
                  : "No account fits this view right now."}
              </EmptyState>
            </div>
          ) : (
            <>
              <ul className="list-none divide-y divide-[--rule-faint] p-0 md:hidden">
                {rows.map((row) => (
                  <AccountCard key={row.id} row={row} />
                ))}
              </ul>
              <div className="hidden md:block">
                <AccountsTable rows={rows} />
              </div>
            </>
          )}
        </Panel>
      </div>
    </main>
  );
}

function QuickLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "t-micro border border-[--text] bg-[--text] px-3 py-2 text-[--surface] no-underline"
          : "t-micro border border-[--rule-strong] px-3 py-2 text-[--text-secondary] no-underline transition-colors duration-fast hover:border-[--text] hover:text-[--text]"
      }
    >
      {children}
    </Link>
  );
}

function Who({ row }: { row: AccountRow }) {
  return (
    <>
      <span className="text-[--text]">{row.name || <Missing>No name</Missing>}</span>
      {row.isAdmin && (
        <Badge tone="neutral" className="ml-2 align-middle">
          Admin
        </Badge>
      )}
      <span className="mt-1 block break-all text-[--text-muted]">{row.email || "No email"}</span>
    </>
  );
}

/** The stage badge, what it was for, and a way into the bookings behind it. */
function HowFar({ row }: { row: AccountRow }) {
  const meta = STAGE_META[row.stage];
  return (
    <>
      <Badge tone={meta.tone}>{meta.label}</Badge>
      {row.detail && <span className="mt-1.5 block text-[--text-secondary]">{row.detail}</span>}
      {row.stage === "account" && !row.confirmed && (
        <span className="mt-1.5 block text-[--text-secondary]">Can&rsquo;t book until they confirm their email</span>
      )}
      {row.bookingCount > 0 && (
        <Link href={`/admin/bookings?q=${encodeURIComponent(row.email)}`} className={`mt-1.5 inline-block ${linkClass}`}>
          {row.bookingCount === 1 ? "See booking" : `See ${row.bookingCount} bookings`}
        </Link>
      )}
    </>
  );
}

function OnList({ list }: { list: AccountRow["list"] }) {
  if (list === "unsubscribed") return <span className="text-[--text-muted]">Unsubscribed</span>;
  return <YesNo value={list === "yes"} />;
}

function AccountsTable({ rows }: { rows: AccountRow[] }) {
  return (
    <TableScroll label="Accounts">
      <Table>
        <thead>
          <tr>
            <Th>Account</Th>
            <Th>Signed up</Th>
            <Th>Email confirmed</Th>
            <Th>Last sign-in</Th>
            <Th>On the list</Th>
            <Th>How far</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {/* One line: the table scrolls inside its box, and an address
                  broken mid-word is harder to read than a scroll. The phone
                  cards let it wrap instead. */}
              <Td className="whitespace-nowrap">
                <Who row={row} />
              </Td>
              <Td className="whitespace-nowrap text-[--text-secondary]">
                <span title={formatStamp(row.createdAt) ?? undefined}>{formatShortStamp(row.createdAt)}</span>
              </Td>
              <Td className="whitespace-nowrap">
                <YesNo value={row.confirmed} />
              </Td>
              <Td className="whitespace-nowrap text-[--text-secondary]">
                {row.lastSignIn ? formatShortStamp(row.lastSignIn) : <Missing>Never</Missing>}
              </Td>
              <Td className="whitespace-nowrap">
                <OnList list={row.list} />
              </Td>
              <Td className="min-w-[12rem]">
                <HowFar row={row} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableScroll>
  );
}

/** The phone layout: the same facts in a stack. */
function AccountCard({ row }: { row: AccountRow }) {
  return (
    <li className="px-4 py-4 font-body text-body-s">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Who row={row} />
        </div>
        <Badge tone={STAGE_META[row.stage].tone} className="shrink-0">
          {STAGE_META[row.stage].label}
        </Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[--text-secondary]">
        <div>
          <dt className="t-micro text-[--text-muted]">Signed up</dt>
          <dd className="mt-0.5">{formatShortStamp(row.createdAt)}</dd>
        </div>
        <div>
          <dt className="t-micro text-[--text-muted]">Last sign-in</dt>
          <dd className="mt-0.5">{row.lastSignIn ? formatShortStamp(row.lastSignIn) : "Never"}</dd>
        </div>
        <div>
          <dt className="t-micro text-[--text-muted]">Email confirmed</dt>
          <dd className="mt-0.5">
            <YesNo value={row.confirmed} />
          </dd>
        </div>
        <div>
          <dt className="t-micro text-[--text-muted]">On the list</dt>
          <dd className="mt-0.5">
            <OnList list={row.list} />
          </dd>
        </div>
      </dl>
      {(row.detail || row.bookingCount > 0 || (row.stage === "account" && !row.confirmed)) && (
        <div className="mt-3">
          {row.detail && <span className="block text-[--text-secondary]">{row.detail}</span>}
          {row.stage === "account" && !row.confirmed && (
            <span className="block text-[--text-secondary]">Can&rsquo;t book until they confirm their email</span>
          )}
          {row.bookingCount > 0 && (
            <Link href={`/admin/bookings?q=${encodeURIComponent(row.email)}`} className={`mt-1.5 inline-block ${linkClass}`}>
              {row.bookingCount === 1 ? "See booking" : `See ${row.bookingCount} bookings`}
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
