/*
 * Access: an ambassador sees their own data and nobody else's, and someone
 * who is not an ambassador gets nothing. Covers the account link
 * (decideLink), the status gate, what one ambassador's view carries
 * (buildPortalView) and the polling endpoint (dashboardHandler), which must
 * never let the request pick whose numbers come back.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HIDDEN_NAME,
  buildPortalView,
  decideLink,
  shortName,
  statusHasAccess,
  type AmbassadorForView,
  type PortalAccess,
  type PortalView,
} from "@/lib/ambassador-rules";
import { TELLURIDE_2026 } from "@/lib/ambassador-program";
import { dashboardHandler } from "@/lib/ambassador-api";

const row = (over: Partial<Parameters<typeof decideLink>[1][number]> = {}) => ({
  code: "STEIN",
  email: "steven@example.edu",
  user_id: null,
  status: "onboarded",
  program: "telluride-2026",
  ...over,
});
const verified = { id: "user-a", email: "Steven@Example.edu", email_confirmed_at: "2026-10-29T00:00:00Z" };

test("an account links only by a verified, exactly matching email", () => {
  assert.deepEqual(decideLink(verified, [row()]), { link: true, code: "STEIN" });
  assert.deepEqual(decideLink({ ...verified, email_confirmed_at: null }, [row()]), { link: false, reason: "unverified" });
  assert.deepEqual(decideLink(verified, [row({ email: "steven@example.ed" })]), { link: false, reason: "none" });
  assert.deepEqual(decideLink(verified, []), { link: false, reason: "none" });
});

test("a row linked to another account is never taken over, and duplicates are refused", () => {
  assert.deepEqual(decideLink(verified, [row({ user_id: "user-b" })]), { link: false, reason: "taken" });
  assert.deepEqual(decideLink(verified, [row(), row({ code: "STEIN2" })]), { link: false, reason: "ambiguous" });
});

test("dropped ambassadors lose the portal; released keep it (Carter, 29 Oct)", () => {
  assert.equal(statusHasAccess("dropped", TELLURIDE_2026), false);
  assert.equal(statusHasAccess("released", TELLURIDE_2026), true);
  assert.equal(statusHasAccess("onboarded", TELLURIDE_2026), true);
});

function amb(code: string, name: string, school: string, over: Partial<AmbassadorForView> = {}): AmbassadorForView {
  return {
    code,
    name,
    school,
    status: "active",
    program: "telluride-2026",
    leaderboardHidden: false,
    holdStatus: null,
    rewardTripStart: null,
    rewardClaimedAt: null,
    bookings: [],
    paidInFull: 0,
    depositOnly: 0,
    ...over,
  };
}

const ALL: AmbassadorForView[] = [
  amb("STEIN", "Steven Stein", "Miami", {
    bookings: [
      { status: "paid_in_full", traveler: "Sarah Kim", tripStart: "2026-12-14", counts: true, depositOnly: false, note: null },
      { status: "deposit_paid", traveler: "Liam O'Neil", tripStart: "2027-01-04", counts: false, depositOnly: true, note: null },
      { status: "pending", traveler: "Pending Person", tripStart: "2026-12-14", counts: false, depositOnly: false, note: "Checkout not finished" },
      { status: "deposit_paid", traveler: "Held Spot", tripStart: "2026-12-14", counts: false, depositOnly: false, note: "Held spot" },
    ],
    paidInFull: 1,
    depositOnly: 1,
  }),
  amb("DUNKLE", "Conner Dunkle", "Arkansas", {
    bookings: [
      { status: "paid_in_full", traveler: "Secret Friend", tripStart: "2026-12-14", counts: true, depositOnly: false, note: null },
      { status: "paid_in_full", traveler: "Other Secret", tripStart: "2026-12-14", counts: true, depositOnly: false, note: null },
    ],
    paidInFull: 2,
    depositOnly: 0,
  }),
  amb("HIDDEN", "Private Person", "TCU", { leaderboardHidden: true, paidInFull: 1, depositOnly: 1 }),
  amb("DROPPED", "Gone Away", "SMU", { status: "dropped", paidInFull: 9 }),
  amb("ZERO", "No Friends", "UGA"),
];

test("an ambassador's view holds their own friends only, as first name and last initial", () => {
  const view = buildPortalView("STEIN", ALL, TELLURIDE_2026)!;
  assert.deepEqual(
    view.friends.map((f) => [f.name, f.trip, f.status, f.counts]),
    [
      ["Sarah K.", "December", "Paid in full", true],
      ["Liam O.", "January", "Deposit paid", false],
    ],
  );
  const json = JSON.stringify(view);
  for (const leaked of ["Secret", "Kim", "O'Neil", "Pending", "Held Spot", "DUNKLE", "HIDDEN", "Private", "@"]) {
    assert.equal(json.includes(leaked), false, `view leaks ${leaked}`);
  }
  assert.equal(view.code, "STEIN");
  assert.equal(view.paid, 1);
  assert.equal(view.onTheWay, 1);
  assert.equal(view.toGo, 4);
});

test("the leaderboard carries rank, short name, school and counts, and nothing about friends or codes", () => {
  const view = buildPortalView("STEIN", ALL, TELLURIDE_2026)!;
  for (const entry of view.leaderboard.top) {
    assert.deepEqual(Object.keys(entry).sort(), ["isYou", "name", "onTheWay", "paid", "rank", "school"]);
  }
  assert.deepEqual(
    view.leaderboard.top.map((e) => [e.rank, e.name, e.school]),
    [
      [1, "Conner D.", "Arkansas"],
      [2, HIDDEN_NAME, null],
      [2, "Steven S.", "Miami"],
    ],
  );
  // Dropped ambassadors are off the board; ambassadors with no friends rank but aren't listed.
  assert.equal(view.leaderboard.you.rank, 2);
  assert.equal(view.leaderboard.you.of, 4);
  assert.equal(JSON.stringify(view.leaderboard).includes("Gone"), false);
});

test("an ambassador who opted out still sees their own name", () => {
  const view = buildPortalView("HIDDEN", ALL, TELLURIDE_2026)!;
  assert.equal(view.leaderboard.hidden, true);
  assert.equal(view.leaderboard.top.find((e) => e.isYou)?.name, "Private P.");
});

test("someone not in the list gets no view at all", () => {
  assert.equal(buildPortalView("NOBODY", ALL, TELLURIDE_2026), null);
});

test("names never carry more than a first name and an initial", () => {
  assert.equal(shortName("sarah   kim"), "Sarah K.");
  assert.equal(shortName("Isaac"), "Isaac");
  assert.equal(shortName(""), "A friend");
  assert.equal(shortName("Mary Elizabeth Cole"), "Mary C.");
  // Markup or an email typed as a name comes out as a word and an initial, never the address.
  assert.equal(shortName("steven.stein@example.edu"), "Steven E.");
  assert.doesNotMatch(shortName("<b>x</b> y@z.com"), /[<>@/]/);
});

/* -- the polling endpoint -------------------------------------------------------- */

const STEIN_ACCESS: PortalAccess = {
  kind: "ambassador",
  userId: "user-a",
  ambassador: { code: "STEIN", name: "Steven Stein", school: "Miami", status: "active", program: "telluride-2026", agreedAt: "2026-10-29T00:00:00Z" },
};

function handler(access: PortalAccess, opts: { limited?: boolean } = {}) {
  const asked: string[] = [];
  const GET = dashboardHandler({
    getAccess: async () => access,
    rateLimit: async () => !opts.limited,
    loadView: async (a) => {
      asked.push(a.code);
      return buildPortalView(a.code, ALL, TELLURIDE_2026) as PortalView;
    },
  });
  return { GET, asked };
}

test("the endpoint answers with the session's own ambassador, whatever the request asks for", async () => {
  const { GET, asked } = handler(STEIN_ACCESS);
  // GET takes no arguments: there is no way to pass ?code=DUNKLE to it at all.
  assert.equal(GET.length, 0);
  const res = await GET();
  assert.equal(res.status, 200);
  assert.deepEqual(asked, ["STEIN"]);
  const body = (await res.json()) as PortalView;
  assert.equal(body.code, "STEIN");
  assert.equal(JSON.stringify(body).includes("Secret"), false);
  assert.match(res.headers.get("cache-control") ?? "", /no-store/);
  assert.match(res.headers.get("cache-control") ?? "", /private/);
});

test("signed out, not an ambassador, or not yet agreed: nothing", async () => {
  const signedOut = await handler({ kind: "signed-out" }).GET();
  assert.equal(signedOut.status, 401);
  const outsider = handler({ kind: "not-ambassador", email: "x@example.edu" });
  const res = await outsider.GET();
  assert.equal(res.status, 403);
  assert.deepEqual(outsider.asked, []);
  assert.deepEqual(Object.keys(await res.json()), ["error"]);
  const unagreed = handler({ ...STEIN_ACCESS, ambassador: { ...STEIN_ACCESS.ambassador, agreedAt: null } });
  assert.equal((await unagreed.GET()).status, 403);
  assert.deepEqual(unagreed.asked, []);
});

test("the endpoint is rate limited", async () => {
  const limited = handler(STEIN_ACCESS, { limited: true });
  const res = await limited.GET();
  assert.equal(res.status, 429);
  assert.deepEqual(limited.asked, []);
});

test("a database fault is a 503, never a wrong answer about who you are", async () => {
  const GET = dashboardHandler({
    getAccess: async () => {
      throw new Error("db down");
    },
    rateLimit: async () => true,
    loadView: async () => null,
  });
  const original = console.error;
  console.error = () => {};
  try {
    const res = await GET();
    assert.equal(res.status, 503);
  } finally {
    console.error = original;
  }
});

test("the view carries the ambassador's own credit so far", () => {
  assert.equal(buildPortalView("STEIN", ALL, TELLURIDE_2026)!.credit, 100);
  assert.equal(buildPortalView("DUNKLE", ALL, TELLURIDE_2026)!.credit, 200);
  assert.equal(buildPortalView("ZERO", ALL, TELLURIDE_2026)!.credit, 0);
});
