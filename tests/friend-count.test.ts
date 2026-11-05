/*
 * The friend-count rule (lib/ambassador-rules.ts, classifyFriend): when a
 * booking made with an ambassador's code counts toward their goal, and which
 * program it counts under. The admin page and the portal both run this exact
 * function.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFriend, tallyProgram, type FriendFacts } from "@/lib/ambassador-rules";
import { SPRING_BREAK_2027, TELLURIDE_2026, countByFor, programForDeparture } from "@/lib/ambassador-program";
import { bookingsCloseAt } from "@/lib/signup-deadline";

const DECEMBER = "2026-12-14";
const JANUARY = "2027-01-04";
const NOV_14_NOON_CENTRAL = Date.parse("2026-11-14T18:00:00Z");
const NOV_15_AFTER_DEADLINE = Date.parse("2026-11-15T06:00:00Z");
const DEC_4_EVENING_CENTRAL = Date.parse("2026-12-05T03:00:00Z");
const DEC_5_AFTER = Date.parse("2026-12-05T06:00:00Z");
const MARCH_8 = "2027-03-08";
const MARCH_15 = "2027-03-15";
// No program names this date.
const UNKNOWN_DEPARTURE = "2027-06-07";

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
  assert.equal(classifyFriend(facts({ tripStart: UNKNOWN_DEPARTURE, paidInFullMs: NOV_15_AFTER_DEADLINE }), TELLURIDE_2026).counts, false);
  assert.equal(classifyFriend(facts({ tripStart: UNKNOWN_DEPARTURE, paidInFullMs: NOV_14_NOON_CENTRAL }), TELLURIDE_2026).counts, true);
});

/* -- each friend counts under one program, 3 November 2026 ---------------------- */

test("a spring break friend does not count toward Telluride, however early they paid", () => {
  for (const tripStart of [MARCH_8, MARCH_15]) {
    const paid = classifyFriend(facts({ tripStart, paidInFullMs: NOV_14_NOON_CENTRAL }), TELLURIDE_2026);
    assert.equal(paid.counts, false, tripStart);
    assert.equal(paid.onTheWay, false, tripStart);
    const deposit = classifyFriend(facts({ tripStart, status: "deposit_paid", paidInFullMs: null }), TELLURIDE_2026);
    assert.equal(deposit.counts, false, tripStart);
    assert.equal(deposit.onTheWay, false, tripStart);
  }
});

test("a Telluride friend does not count toward spring break", () => {
  for (const tripStart of [DECEMBER, JANUARY]) {
    const paid = classifyFriend(facts({ tripStart, paidInFullMs: NOV_14_NOON_CENTRAL }), SPRING_BREAK_2027);
    assert.equal(paid.counts, false, tripStart);
    assert.equal(paid.onTheWay, false, tripStart);
    const deposit = classifyFriend(facts({ tripStart, status: "deposit_paid", paidInFullMs: null }), SPRING_BREAK_2027);
    assert.equal(deposit.onTheWay, false, tripStart);
  }
});

test("a departure no program names is Telluride's, never spring break's", () => {
  assert.equal(programForDeparture(UNKNOWN_DEPARTURE).id, TELLURIDE_2026.id);
  assert.equal(programForDeparture(null).id, TELLURIDE_2026.id);
  assert.equal(classifyFriend(facts({ tripStart: UNKNOWN_DEPARTURE }), SPRING_BREAK_2027).counts, false);
  assert.equal(programForDeparture(MARCH_8).id, SPRING_BREAK_2027.id);
  assert.equal(programForDeparture(DECEMBER).id, TELLURIDE_2026.id);
});

test("a spring break friend counts by their own week's booking close, each week its own", () => {
  for (const tripStart of [MARCH_8, MARCH_15]) {
    const close = bookingsCloseAt(tripStart).getTime();
    assert.equal(countByFor(SPRING_BREAK_2027, tripStart).getTime(), close);
    assert.equal(classifyFriend(facts({ tripStart, paidInFullMs: close }), SPRING_BREAK_2027).counts, true);
    const late = classifyFriend(facts({ tripStart, paidInFullMs: close + 1000 }), SPRING_BREAK_2027);
    assert.equal(late.counts, false);
    assert.equal(late.note, "Paid after the deadline");
  }
  // The weeks close apart, so a payment can be late for one and on time for the other.
  const between = bookingsCloseAt(MARCH_8).getTime() + 1000;
  assert.equal(classifyFriend(facts({ tripStart: MARCH_8, paidInFullMs: between }), SPRING_BREAK_2027).counts, false);
  assert.equal(classifyFriend(facts({ tripStart: MARCH_15, paidInFullMs: between }), SPRING_BREAK_2027).counts, true);
});

test("Telluride's deadlines did not move when spring break arrived", () => {
  assert.equal(countByFor(TELLURIDE_2026, DECEMBER).toISOString(), "2026-11-15T05:59:59.000Z");
  assert.equal(countByFor(TELLURIDE_2026, JANUARY).toISOString(), "2026-12-05T05:59:59.000Z");
  assert.equal(countByFor(TELLURIDE_2026, UNKNOWN_DEPARTURE).toISOString(), "2026-11-15T05:59:59.000Z");
  assert.equal(TELLURIDE_2026.goal, 5);
  assert.equal(TELLURIDE_2026.perFriendCredit, 100);
});

test("the tally adds a friend under their own program only, and Telluride's totals are what they would be alone", () => {
  // Classified the way lib/ambassadors.ts does: against the program that owns the trip.
  const row = (over: Partial<FriendFacts>) => {
    const f = facts(over);
    const program = programForDeparture(f.tripStart);
    const v = classifyFriend(f, program);
    return { programId: program.id, counts: v.counts, depositOnly: v.onTheWay };
  };
  const telluride = [
    row({ tripStart: DECEMBER }),
    row({ tripStart: DECEMBER }),
    row({ tripStart: JANUARY, paidInFullMs: DEC_4_EVENING_CENTRAL }),
    row({ tripStart: JANUARY, status: "deposit_paid", paidInFullMs: null }),
    row({ tripStart: DECEMBER, paidInFullMs: NOV_15_AFTER_DEADLINE }),
  ];
  const spring = [
    row({ tripStart: MARCH_8, paidInFullMs: NOV_14_NOON_CENTRAL }),
    row({ tripStart: MARCH_15, paidInFullMs: NOV_14_NOON_CENTRAL }),
    row({ tripStart: MARCH_15, status: "deposit_paid", paidInFullMs: null }),
    row({ tripStart: MARCH_8, status: "deposit_paid", paidInFullMs: null }),
  ];
  const alone = tallyProgram(telluride, TELLURIDE_2026);
  assert.deepEqual(alone, { paidInFull: 3, depositOnly: 1, toGoal: 2 });
  assert.deepEqual(tallyProgram([...telluride, ...spring], TELLURIDE_2026), alone);
  assert.deepEqual(tallyProgram([...spring, ...telluride], SPRING_BREAK_2027), { paidInFull: 2, depositOnly: 2, toGoal: 8 });
});

test("spring break friends can never reach Telluride's goal, which is what a free held spot reads", () => {
  const tenOnSpring = Array.from({ length: 10 }, () => {
    const v = classifyFriend(facts({ tripStart: MARCH_8 }), SPRING_BREAK_2027);
    return { programId: SPRING_BREAK_2027.id, counts: v.counts, depositOnly: v.onTheWay };
  });
  assert.equal(tallyProgram(tenOnSpring, SPRING_BREAK_2027).toGoal, 0);
  assert.deepEqual(tallyProgram(tenOnSpring, TELLURIDE_2026), { paidInFull: 0, depositOnly: 0, toGoal: 5 });
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
