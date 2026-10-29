/*
 * The friend-count rule (lib/ambassador-rules.ts, classifyFriend): when a
 * booking made with an ambassador's code counts toward their five. The admin
 * page and the portal both run this exact function.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFriend, type FriendFacts } from "@/lib/ambassador-rules";
import { TELLURIDE_2026 } from "@/lib/ambassador-program";

const DECEMBER = "2026-12-14";
const JANUARY = "2027-01-04";
const NOV_14_NOON_CENTRAL = Date.parse("2026-11-14T18:00:00Z");
const NOV_15_AFTER_DEADLINE = Date.parse("2026-11-15T06:00:00Z");
const DEC_4_EVENING_CENTRAL = Date.parse("2026-12-05T03:00:00Z");
const DEC_5_AFTER = Date.parse("2026-12-05T06:00:00Z");

function facts(over: Partial<FriendFacts> = {}): FriendFacts {
  return {
    status: "paid_in_full",
    isHold: false,
    isTest: false,
    refunded: false,
    paidInFullMs: NOV_14_NOON_CENTRAL,
    tripStart: DECEMBER,
    ...over,
  };
}

test("paid in full by the deadline counts", () => {
  const v = classifyFriend(facts(), TELLURIDE_2026);
  assert.equal(v.counts, true);
  assert.equal(v.onTheWay, false);
  assert.equal(v.note, null);
});

test("a deposit is on the way, not counted", () => {
  const v = classifyFriend(facts({ status: "deposit_paid", paidInFullMs: null }), TELLURIDE_2026);
  assert.equal(v.counts, false);
  assert.equal(v.onTheWay, true);
});

test("a December friend paid after November 14 does not count", () => {
  const v = classifyFriend(facts({ paidInFullMs: NOV_15_AFTER_DEADLINE }), TELLURIDE_2026);
  assert.equal(v.counts, false);
  assert.equal(v.note, "Paid after the deadline");
});

test("a January friend counts if paid in full by the end of December 4, Central", () => {
  assert.equal(classifyFriend(facts({ tripStart: JANUARY, paidInFullMs: NOV_15_AFTER_DEADLINE }), TELLURIDE_2026).counts, true);
  assert.equal(classifyFriend(facts({ tripStart: JANUARY, paidInFullMs: DEC_4_EVENING_CENTRAL }), TELLURIDE_2026).counts, true);
  assert.equal(classifyFriend(facts({ tripStart: JANUARY, paidInFullMs: DEC_5_AFTER }), TELLURIDE_2026).counts, false);
});

test("an unknown departure falls back to the signup deadline", () => {
  assert.equal(classifyFriend(facts({ tripStart: "2027-03-08", paidInFullMs: NOV_15_AFTER_DEADLINE }), TELLURIDE_2026).counts, false);
});

test("[seed] and test bookings never count on the live site, but do in the sandbox", () => {
  const live = classifyFriend(facts({ isTest: true }), TELLURIDE_2026, false);
  assert.equal(live.counts, false);
  assert.equal(live.note, "Test booking");
  assert.equal(classifyFriend(facts({ isTest: true }), TELLURIDE_2026, true).counts, true);
  assert.equal(classifyFriend(facts({ isTest: true, status: "deposit_paid", paidInFullMs: null }), TELLURIDE_2026).onTheWay, false);
});

test("cancelled, refunded, held and pending bookings are neither counted nor on the way", () => {
  for (const over of [
    { status: "cancelled" as const },
    { refunded: true },
    { isHold: true },
    { status: "pending" as const, paidInFullMs: null },
  ]) {
    const v = classifyFriend(facts(over), TELLURIDE_2026);
    assert.equal(v.counts, false, JSON.stringify(over));
    assert.equal(v.onTheWay, false, JSON.stringify(over));
  }
});

test("paid in full with no payment time on record never counts", () => {
  assert.equal(classifyFriend(facts({ paidInFullMs: null }), TELLURIDE_2026).counts, false);
});

test("short of five, each friend who counts takes $100 off the ambassador's spot; five makes it free", async () => {
  const { friendCredit, spotPrice } = await import("@/lib/ambassador-program");
  assert.equal(friendCredit(TELLURIDE_2026, 0), 0);
  assert.equal(friendCredit(TELLURIDE_2026, 1), 100);
  assert.equal(friendCredit(TELLURIDE_2026, 4), 400);
  assert.equal(friendCredit(TELLURIDE_2026, 5), 0);
  assert.equal(spotPrice(TELLURIDE_2026, 1400, 3), 1100);
  assert.equal(spotPrice(TELLURIDE_2026, 1700, 4), 1300);
  assert.equal(spotPrice(TELLURIDE_2026, 1400, 5), 0);
  assert.equal(spotPrice(TELLURIDE_2026, 1400, 7), 0);
  assert.equal(spotPrice(TELLURIDE_2026, 50, 4), 0);
});
