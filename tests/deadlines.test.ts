/*
 * Bookings close per week (Carter, 29 Oct 2026, lib/signup-deadline.ts):
 * December at the end of 14 November, January at the end of 4 December,
 * both Central. Nothing is booked once both have passed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LAST_SIGNUP_DEADLINE_LABEL,
  bookingsCloseAt,
  closeLabel,
  departureClosed,
  signupsClosed,
} from "@/lib/signup-deadline";

const DEC = "2026-12-14";
const JAN = "2027-01-04";
const at = (iso: string) => new Date(iso);

test("each week closes at the end of its own day, Central", () => {
  assert.equal(closeLabel(DEC), "November 14");
  assert.equal(closeLabel(JAN), "December 4");
  assert.equal(LAST_SIGNUP_DEADLINE_LABEL, "December 4");
  // 11:59 PM Central on 14 November is 05:59 UTC on the 15th.
  assert.equal(departureClosed(DEC, at("2026-11-15T05:59:00Z")), false);
  assert.equal(departureClosed(DEC, at("2026-11-15T06:00:00Z")), true);
  assert.equal(departureClosed(JAN, at("2026-11-20T12:00:00Z")), false);
  assert.equal(departureClosed(JAN, at("2026-12-05T05:59:00Z")), false);
  assert.equal(departureClosed(JAN, at("2026-12-05T06:00:00Z")), true);
});

test("signups close everywhere only after the last week closes", () => {
  assert.equal(signupsClosed(at("2026-11-20T12:00:00Z")), false);
  assert.equal(signupsClosed(at("2026-12-05T06:00:00Z")), true);
});

test("a week no one has given a date closes with December", () => {
  assert.equal(bookingsCloseAt("2027-03-08").toISOString(), bookingsCloseAt(DEC).toISOString());
  assert.equal(bookingsCloseAt(null).toISOString(), bookingsCloseAt(DEC).toISOString());
});
