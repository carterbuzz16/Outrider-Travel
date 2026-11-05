/*
 * Spring break as an ambassador program (3 November 2026): what is decided is
 * in the config, what is not decided is promised nowhere, and an ambassador's
 * link on a spring break surface is a spring break link.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PROGRAMS,
  SPRING_BREAK_2027,
  TELLURIDE_2026,
  defaultPortalProgram,
  friendCredit,
  openPrograms,
  programClosed,
  programFor,
  referralLink,
  referralPath,
} from "@/lib/ambassador-program";
import { NO_PORTAL_STATUSES, statusHasAccess } from "@/lib/ambassador-rules";
import { isLiveAttributionCode } from "@/lib/referral-cookie";
import { AMBASSADOR, AMBASSADOR_PORTAL } from "@/lib/site-content";
import { LAST_BOOKING_CLOSE, departureClosed } from "@/lib/signup-deadline";

test("the program says what Carter decided and leaves the rest out", () => {
  assert.equal(SPRING_BREAK_2027.goal, 10);
  assert.deepEqual(Object.keys(SPRING_BREAK_2027.departures), ["2027-03-08", "2027-03-15"]);
  assert.equal(SPRING_BREAK_2027.landingPath, "/spring-break");
  assert.equal(SPRING_BREAK_2027.releasedKeepAccess, true);
  assert.equal(SPRING_BREAK_2027.agreement.version, "spring-break-2027.1");
  assert.equal(SPRING_BREAK_2027.agreement.slug, TELLURIDE_2026.agreement.slug);
  // Not decided, so nothing is promised.
  assert.equal(SPRING_BREAK_2027.perFriendCredit, 0);
  assert.equal(friendCredit(SPRING_BREAK_2027, 9), 0);
  assert.equal(SPRING_BREAK_2027.heldSpots, false);
  assert.equal(SPRING_BREAK_2027.freeTrip.picksWeek, false);
});

test("anything unknown is still Telluride", () => {
  assert.equal(programFor(null).id, TELLURIDE_2026.id);
  assert.equal(programFor("nonsense").id, TELLURIDE_2026.id);
  assert.equal(programFor(SPRING_BREAK_2027.id).id, SPRING_BREAK_2027.id);
});

test("released ambassadors keep the portal for spring break; dropped and code-only do not", () => {
  assert.equal(statusHasAccess("released", SPRING_BREAK_2027), true);
  for (const status of NO_PORTAL_STATUSES) assert.equal(statusHasAccess(status, SPRING_BREAK_2027), false, status);
});

test("the agreement carries no date, credit or held spot it could later have to take back", () => {
  const terms = SPRING_BREAK_2027.agreement.terms.join(" ");
  assert.doesNotMatch(terms, /\b(January|February|March|April)\b/);
  assert.doesNotMatch(terms, /\$\d/);
  assert.match(terms, /No spot is held/);
  assert.match(terms, /10 friends who count and your trip is free/);
});

test("the portal opens on Telluride while it sells, then spring break", () => {
  assert.equal(defaultPortalProgram(new Date("2026-11-03T12:00:00Z")).id, TELLURIDE_2026.id);
  assert.equal(defaultPortalProgram(new Date("2026-12-05T05:59:00Z")).id, TELLURIDE_2026.id);
  assert.equal(defaultPortalProgram(new Date("2026-12-05T06:00:00Z")).id, SPRING_BREAK_2027.id);
});

test("what is still selling, for the public page, drops Telluride after it closes", () => {
  const ids = (d: string) => openPrograms(new Date(d)).map((p) => p.id);
  assert.deepEqual(ids("2026-11-03T12:00:00Z"), [TELLURIDE_2026.id, SPRING_BREAK_2027.id]);
  // December is closed and January is not: Telluride still sells.
  assert.deepEqual(ids("2026-11-20T12:00:00Z"), [TELLURIDE_2026.id, SPRING_BREAK_2027.id]);
  assert.deepEqual(ids("2026-12-06T12:00:00Z"), [SPRING_BREAK_2027.id]);
  assert.deepEqual(ids("2027-03-01T12:00:00Z"), []);
  assert.equal(programClosed(TELLURIDE_2026, new Date("2026-11-20T12:00:00Z")), false);
  assert.equal(programClosed(TELLURIDE_2026, new Date("2026-12-06T12:00:00Z")), true);
});

test("/ambassador states both goals while both sell and only spring break after, and no reward for 'every friend'", () => {
  const both = [
    { name: "Telluride", goal: 5 },
    { name: "spring break", goal: 10 },
  ];
  assert.equal(AMBASSADOR.goals(both), "5 friends for Telluride. 10 friends for spring break.");
  assert.equal(AMBASSADOR.goals([both[1]]), "10 friends for spring break.");
  assert.equal(AMBASSADOR.goals([]), "");
  const after = JSON.stringify([AMBASSADOR.perk, AMBASSADOR.goals([both[1]]), AMBASSADOR.steps([both[1]]), AMBASSADOR.get]);
  assert.doesNotMatch(after, /Telluride|December|January|every friend/i);
  assert.doesNotMatch(JSON.stringify(AMBASSADOR.steps(both)), /every friend/i);
  assert.doesNotMatch(JSON.stringify(AMBASSADOR.steps([])), /Telluride/);
});

test("a spring break link goes to /spring-break, and the path always names its program", () => {
  assert.equal(referralPath("STEIN", SPRING_BREAK_2027), "/spring-break?ref=stein");
  assert.equal(referralPath("STEIN", TELLURIDE_2026), "/telluride?ref=stein");
  assert.equal(referralLink("https://outrider.travel/", "STEIN", SPRING_BREAK_2027), "https://outrider.travel/spring-break?ref=stein");
});

test("spring break's scripts and questions say nothing of Telluride, or of a credit or held spot", () => {
  const scripts = AMBASSADOR_PORTAL.scripts[SPRING_BREAK_2027.id];
  assert.equal(scripts.length, 3);
  const words = JSON.stringify(scripts);
  assert.doesNotMatch(words, /Telluride|Peaks|ski/i);
  assert.match(words, /Zemi Miches/);
  assert.match(words, /\{link\}/);
  assert.match(words, /\{code\}/);
  assert.doesNotMatch(words, /\?/);

  const faq = JSON.stringify(AMBASSADOR_PORTAL.faq("the end of a day", 10, false));
  assert.doesNotMatch(faq, /Telluride|short of|\$100|held/i);
  // Telluride keeps its answer, word for word.
  assert.match(JSON.stringify(AMBASSADOR_PORTAL.faq("the end of a day", 5, true)), /short of 5/);
});

test("the copy keeps the house rules", () => {
  const banned =
    /·|—|!|\b(curated|bespoke|unforgettable|epic|vibes|seamless|journey|ultimate|premier|crafted|unlock|designed to|ensures)\b/i;
  const copy = JSON.stringify([
    SPRING_BREAK_2027.agreement,
    SPRING_BREAK_2027.perks,
    SPRING_BREAK_2027.freeTrip.earned,
    AMBASSADOR_PORTAL.scripts[SPRING_BREAK_2027.id],
    AMBASSADOR_PORTAL.faq("the end of a day", 10, false),
    AMBASSADOR.perk,
    AMBASSADOR.get,
    AMBASSADOR.steps([{ name: "spring break", goal: 10 }]),
  ]);
  assert.doesNotMatch(copy, banned);
});

test("every program has its own agreement version, and its own scripts", () => {
  const versions = Object.values(PROGRAMS).map((p) => p.agreement.version);
  assert.equal(new Set(versions).size, versions.length);
  for (const p of Object.values(PROGRAMS)) assert.ok(AMBASSADOR_PORTAL.scripts[p.id]?.length, p.id);
});

test("a code that outlives Telluride credits spring break, and Telluride still refuses by its own close", () => {
  const code = { amount: 0, percent_off: null, active: true, expires_at: LAST_BOOKING_CLOSE.toISOString() };
  const afterTelluride = new Date("2026-12-06T12:00:00Z");
  assert.equal(isLiveAttributionCode(code, afterTelluride), true);
  // createBooking asks this of the departure, whatever the code.
  assert.equal(departureClosed("2026-12-14", afterTelluride), true);
  assert.equal(departureClosed("2027-01-04", afterTelluride), true);
  assert.equal(departureClosed("2027-03-08", afterTelluride), false);
});

test("the SQL for existing codes moves them to the last booking close, and only ambassadors' $0 codes", () => {
  const sql = readFileSync("scripts/spring-break-ambassador-codes.sql", "utf8");
  const when = LAST_BOOKING_CLOSE.toISOString().replace("T", " ").replace(".000Z", "+00");
  const statement = sql.replace(/--.*$/gm, "");
  assert.ok(statement.includes(`timestamptz '${when}'`), `expected ${when}; if the close moved, update the SQL and run it again`);
  assert.match(statement, /FROM\s+public\.ambassadors/i);
  assert.match(statement, /amount\s*=\s*0/);
  assert.match(statement, /percent_off\s+IS\s+NULL/i);
});
