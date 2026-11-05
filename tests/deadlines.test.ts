/*
 * Bookings close per week (Carter, 29 Oct 2026, lib/signup-deadline.ts):
 * December at the end of 14 November, January at the end of 4 December,
 * both Central. Nothing is booked once both have passed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LAST_BOOKING_CLOSE,
  LAST_SIGNUP_DEADLINE,
  LAST_SIGNUP_DEADLINE_LABEL,
  SPRING_BREAK_DATES_CONFIRMED,
  bookingsCloseAt,
  closeLabel,
  departureClosed,
  signupsClosed,
  tellurideClosed,
} from "@/lib/signup-deadline";
import { lineForDestination } from "@/lib/trip-lines";

const DEC = "2026-12-14";
const JAN = "2027-01-04";
const MAR8 = "2027-03-08";
const MAR15 = "2027-03-15";
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

test("Telluride finishes selling after January, and spring break keeps signups open only once it is on sale", () => {
  assert.equal(tellurideClosed(at("2026-11-20T12:00:00Z")), false);
  assert.equal(tellurideClosed(at("2026-12-05T06:00:00Z")), true);
  assert.equal(signupsClosed(at("2026-12-05T06:00:00Z")), !SPRING_BREAK_DATES_CONFIRMED);
});

test("spring break's dates do not move Telluride's last close", () => {
  // The Telluride ambassador program, its codes and the admin release read
  // this one, so it has to stay December 4 however late spring break runs.
  assert.equal(LAST_SIGNUP_DEADLINE.toISOString(), "2026-12-05T05:59:59.000Z");
});

test("each spring break week closes on its own date, and then everything is closed", () => {
  assert.equal(closeLabel(MAR8), "January 15");
  assert.equal(closeLabel(MAR15), "January 22");
  assert.equal(departureClosed(MAR8, at("2027-01-16T05:59:00Z")), false);
  assert.equal(departureClosed(MAR8, at("2027-01-16T06:00:00Z")), true);
  assert.equal(departureClosed(MAR15, at("2027-01-16T06:00:00Z")), false);
  assert.equal(LAST_BOOKING_CLOSE.toISOString(), "2027-01-23T05:59:59.000Z");
  assert.equal(signupsClosed(at("2027-01-23T06:00:00Z")), true);
});

test("a week no one has given a date closes with December", () => {
  assert.equal(bookingsCloseAt("2027-06-07").toISOString(), bookingsCloseAt(DEC).toISOString());
  assert.equal(bookingsCloseAt(null).toISOString(), bookingsCloseAt(DEC).toISOString());
});

test("a trip's line comes from its destination, and anything unknown is ski", () => {
  assert.equal(lineForDestination("Telluride, Colorado").id, "ski");
  assert.equal(lineForDestination("Seed Mountain, Colorado").id, "ski");
  assert.equal(lineForDestination(null).id, "ski");
  assert.equal(lineForDestination("Punta Cana, Dominican Republic").id, "spring-break");
  assert.equal(lineForDestination("Miches").id, "spring-break");
});
