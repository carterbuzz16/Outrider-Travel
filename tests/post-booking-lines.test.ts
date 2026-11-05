/*
 * Everything after Reserve has to be true of the trip that was booked (3
 * November 2026): a spring breaker is never asked for a shoe size or told to fly
 * into Montrose, and a Telluride booker's rules did not move.
 *
 * Only pure modules here. lib/email/post-booking.ts is server-only, so its
 * spring break templates and plain-text parts are tested from their own files.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SKI, SPRING_BREAK_LINE, lineById, lineForDestination } from "@/lib/trip-lines";
import { detailsTaskComplete, detailsTaskDone, gearComplete } from "@/lib/traveler-details";
import { departuresByLine, departuresToOffer, openUntilLine } from "@/lib/departure-picker";
import { flightTimesPublished, getTripLogistics } from "@/lib/trip-logistics";
import { renderTemplate, templateVariables } from "@/lib/email/render-template";
import confirmationSpring, { springConfirmationText } from "@/lib/email/templates/confirmation-spring";
import chaseSpring, { springChaseText } from "@/lib/email/templates/chase-spring";
import confirmationTelluride from "@/lib/email/templates/confirmation";
import { listEmailHtml, springBreakWelcomeHtml } from "@/lib/email/templates/waitlist-welcome";

const NO_GEAR = { ski_or_board: null, ability_level: null, height: null, weight: null, shoe_size: null };
const GEAR = { ski_or_board: "ski", ability_level: "beginner", height: "5'10", weight: "165", shoe_size: "10" };

/* -- the details task ---------------------------------------------------------- */

test("a spring breaker's details are done with the identity row, no gear", () => {
  assert.equal(detailsTaskComplete(SPRING_BREAK_LINE, NO_GEAR), true);
  assert.equal(detailsTaskComplete(SPRING_BREAK_LINE, GEAR), true);
});

test("no row is not done, on either line", () => {
  assert.equal(detailsTaskComplete(SPRING_BREAK_LINE, null), false);
  assert.equal(detailsTaskComplete(SPRING_BREAK_LINE, undefined), false);
  assert.equal(detailsTaskComplete(SKI, null), false);
});

test("a Telluride booker's details still need every size", () => {
  assert.equal(detailsTaskComplete(SKI, NO_GEAR), false);
  assert.equal(detailsTaskComplete(SKI, { ...GEAR, shoe_size: null }), false);
  assert.equal(detailsTaskComplete(SKI, GEAR), true);
  assert.equal(detailsTaskComplete(SKI, GEAR), gearComplete(GEAR));
});

test("the chase reads the row on spring break and the flag on Telluride", () => {
  // Checkout's row on Telluride: the rental shop still knows nothing, so it chases.
  assert.equal(detailsTaskDone(SKI, { detailsSubmitted: false, hasDetailsRow: true }), false);
  assert.equal(detailsTaskDone(SKI, { detailsSubmitted: true, hasDetailsRow: true }), true);
  // Spring break's flag write failed, the row is there: no email asking again.
  assert.equal(detailsTaskDone(SPRING_BREAK_LINE, { detailsSubmitted: false, hasDetailsRow: true }), true);
  // Swept off an unpaid checkout and then paid: the trip page asks again, so may this.
  assert.equal(detailsTaskDone(SPRING_BREAK_LINE, { detailsSubmitted: true, hasDetailsRow: false }), false);
});

/* -- the checkout picker ------------------------------------------------------- */

const tier = (name: string) => ({ id: `id-${name}`, name });
const DEC = { destination: "Telluride, Colorado", startDate: "2026-12-14", bookingClosed: false, tiers: [tier("BASE"), tier("MID")] };
const JAN = { destination: "Telluride, Colorado", startDate: "2027-01-04", bookingClosed: false, tiers: [tier("BASE")] };
const MAR8 = { destination: "Punta Cana, Dominican Republic", startDate: "2027-03-08", bookingClosed: false, tiers: [tier("TWO TO A ROOM")] };
const MAR15 = { destination: "Punta Cana, Dominican Republic", startDate: "2027-03-15", bookingClosed: false, tiers: [tier("TWO TO A ROOM")] };
const ALL = [DEC, JAN, MAR8, MAR15];

test("?line= filters the departures to that line", () => {
  assert.deepEqual(departuresToOffer(ALL, { line: lineById("spring-break") }), { trips: [MAR8, MAR15], lineMissed: null });
  assert.deepEqual(departuresToOffer(ALL, { line: lineById("ski") }), { trips: [DEC, JAN], lineMissed: null });
});

test("no line offers everything, and an unknown ?line= is no line", () => {
  assert.equal(lineById("telluride"), null);
  assert.deepEqual(departuresToOffer(ALL, { line: lineById("telluride") }).trips, ALL);
});

test("a link naming a Telluride package stays on Telluride", () => {
  // /telluride's package buttons name no trip or line.
  assert.deepEqual(departuresToOffer(ALL, { requestedPackage: "BASE" }).trips, [DEC, JAN]);
  assert.deepEqual(departuresToOffer(ALL, { requestedPackage: " base " }).trips, [DEC, JAN]);
  assert.deepEqual(departuresToOffer(ALL, { requestedPackage: "id-TWO TO A ROOM" }).trips, [MAR8, MAR15]);
  assert.deepEqual(departuresToOffer(ALL, { requestedPackage: "NOPE" }).trips, ALL);
  // A line asked for wins over the package.
  assert.deepEqual(departuresToOffer(ALL, { line: SPRING_BREAK_LINE, requestedPackage: "BASE" }).trips, [MAR8, MAR15]);
});

test("a line with nothing open says so and offers the rest", () => {
  assert.deepEqual(departuresToOffer([MAR8], { line: SKI }), { trips: [MAR8], lineMissed: SKI });
});

test("departures group by line in the site's order, without empty lines", () => {
  assert.deepEqual(
    departuresByLine(ALL).map((g) => [g.line.id, g.trips.length]),
    [["ski", 2], ["spring-break", 2]],
  );
  assert.deepEqual(departuresByLine([MAR8]).map((g) => g.line.id), ["spring-break"]);
});

/* -- the empty account --------------------------------------------------------- */

test("the empty account says what is open, trip by trip", () => {
  assert.equal(
    openUntilLine(ALL),
    "Telluride is open: December until November 14, January until December 4. Punta Cana is open: March 8 until January 15, March 15 until January 22.",
  );
});

test("Telluride's line is the words it always was, and closed weeks drop out", () => {
  assert.equal(
    openUntilLine([DEC, JAN]),
    "Telluride is open: December until November 14, January until December 4.",
  );
  assert.equal(
    openUntilLine([{ ...DEC, bookingClosed: true }, JAN]),
    "Telluride is open: January until December 4.",
  );
  assert.equal(openUntilLine([]), "");
});

test("a sandbox's test copy of a week is not named twice", () => {
  const seed = { ...MAR8, destination: "Seed Beach, Punta Cana" };
  assert.equal(
    openUntilLine([MAR8, seed, MAR15]),
    "Punta Cana is open: March 8 until January 15, March 15 until January 22.",
  );
});

test("March 15 is still named by its day once March 8 has closed", () => {
  assert.equal(
    openUntilLine([{ ...MAR8, bookingClosed: true }, MAR15]),
    "Punta Cana is open: March 15 until January 22.",
  );
  assert.equal(openUntilLine([{ ...MAR8, bookingClosed: true }, { ...MAR15, bookingClosed: true }]), "");
});

/* -- logistics ----------------------------------------------------------------- */

test("flight times on Telluride's pages ignore spring break's empty rows", () => {
  assert.equal(flightTimesPublished(), false);
  assert.equal(getTripLogistics("2027-03-08").arrivalDeadline, null);
  assert.equal(getTripLogistics("2026-12-14").propertyName, "The Peaks Resort and Spa");
});

/* -- the spring break emails --------------------------------------------------- */

const VARS = {
  first_name: "Jordan",
  confirmation_number: "OR-TEST",
  tier_name: "Two to a Room",
  amount_paid: "$100.00",
  balance_due: "$1,100.00",
  next_payment_amount: "$550.00",
  next_payment_date: "January 15, 2027",
  total_price: "$1,200.00",
  portal_url: "https://example.com/trip/1?t=a",
  rooming_url: "https://example.com/trip/1?t=a#rooming",
  traveler_details_url: "https://example.com/trip/1?t=a#details",
  preferences_url: "https://example.com/privacy#email",
  trip_name: "Punta Cana",
  trip_dates: "Mar 8–12, 2027",
  arrival_day: "Monday, March 8",
  departure_day: "Friday, March 12",
  days_until_trip: "125 days",
  property_name: "Zemi Miches, Curio Collection by Hilton",
};
const POSTAL = { street: "1 Test St", cityStateZip: "Testville, TX" };
const PAID = { paid_in_full: false, has_balance: true };
const OPEN = { flights_booked: false, rooming_submitted: false, details_submitted: false };

// Words that would be false of Punta Cana, and what the brand never prints.
const NOT_SPRING = /montrose|\bmtj\b|lift ticket|rental|ski\b|snowboard|the peaks|gorrono|telluride|mountain|ski club/i;
const NEVER = /·|&middot;|—|&mdash;|!(?!-)|curated|bespoke|unforgettable|\bepic\b|vibes|seamless|journey|ultimate|premier|crafted|unlock|designed to|ensures/i;

/** What a reader sees: no doctype, comments, style, or markup. */
function visible(html: string): string {
  return html
    .replace(/<!DOCTYPE[^>]*>/i, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ");
}

/** And the links a reader follows, which must not lead back to the other trip either. */
function hrefs(html: string): string {
  return [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]).join(" ");
}

test("the spring confirmation renders with no capacity or rooming date, which spring break lacks", () => {
  // The render refuses a missing variable, and that would send the plain fallback.
  assert.ok(!templateVariables(confirmationSpring).includes("trip_capacity"));
  assert.ok(!templateVariables(confirmationSpring).includes("rooming_lock_date"));
  assert.ok(!templateVariables(chaseSpring).includes("trip_capacity"));
  assert.ok(!templateVariables(chaseSpring).includes("rooming_lock_date"));
  assert.ok(templateVariables(confirmationTelluride).includes("trip_capacity"));
  renderTemplate(confirmationSpring, { variables: VARS, flags: PAID, postalAddress: POSTAL });
  renderTemplate(chaseSpring, { variables: VARS, flags: OPEN, postalAddress: POSTAL });
});

test("the spring confirmation is true of Punta Cana, in both parts", () => {
  const html = renderTemplate(confirmationSpring, { variables: VARS, flags: PAID, postalAddress: POSTAL });
  const text = springConfirmationText(VARS);
  for (const part of [visible(html), text]) {
    assert.doesNotMatch(part, NOT_SPRING);
    assert.doesNotMatch(part, NEVER);
    assert.match(part, /PUJ/);
    assert.match(part, /valid passport/);
    assert.match(part, /hour and a half/);
  }
  assert.doesNotMatch(hrefs(html), /telluride/);
  assert.match(hrefs(html), /\/spring-break/);
  assert.match(hrefs(html), /\/flights#punta-cana/);
  // Faye's disclosure, word for word, wherever the link goes.
  assert.match(html, /Faye is a partner of ours\. We earn a commission if you buy through this link, and it costs you nothing extra\./);
  // Asks for nothing checkout already took.
  assert.doesNotMatch(visible(html), /traveler details/i);
  // Its payment line comes from the schedule; the sentence is shown only with a balance.
  assert.match(visible(html), /January 15, 2027/);
  const full = renderTemplate(confirmationSpring, {
    variables: VARS,
    flags: { paid_in_full: true, has_balance: false },
    postalAddress: POSTAL,
  });
  assert.doesNotMatch(visible(full), /next payment/);
  assert.match(visible(full), /You paid in full/);
});

test("the spring chase lists only what is open and never a size", () => {
  const html = renderTemplate(chaseSpring, {
    variables: VARS,
    flags: { flights_booked: true, rooming_submitted: false, details_submitted: true },
    postalAddress: POSTAL,
  });
  const seen = visible(html);
  assert.doesNotMatch(seen, /Your flights/);
  assert.match(seen, /Who you're rooming with|Who you&#39;re rooming with/);
  assert.doesNotMatch(seen, /Your traveler details/);
  assert.doesNotMatch(seen, NOT_SPRING);
  assert.doesNotMatch(seen, NEVER);
  assert.doesNotMatch(hrefs(html), /telluride/);

  const text = springChaseText(VARS, { flights_booked: false, rooming_submitted: true, details_submitted: true });
  assert.match(text, /PUJ/);
  assert.doesNotMatch(text, /rooming with:/);
  assert.doesNotMatch(text, NOT_SPRING);
  assert.doesNotMatch(text, NEVER);
});

test("the spring welcome says where, and links to the trip it is about", () => {
  const html = springBreakWelcomeHtml({
    origin: "https://example.com",
    unsubscribeUrl: "https://example.com/unsubscribe?t=a",
    bookingsOpen: true,
    addressLine: "Outrider Travel, LLC, 1 Test St",
    preheader: "preheader",
  });
  const seen = visible(html);
  assert.doesNotMatch(seen, /somewhere warm/i);
  assert.match(seen, /Punta Cana/);
  assert.match(seen, /Zemi Miches/);
  assert.doesNotMatch(hrefs(html), /telluride/);
  assert.match(hrefs(html), /example\.com\/spring-break/);
  assert.doesNotMatch(seen, NEVER);
  // The shell's default hero stays Telluride's for everyone else.
  assert.match(
    listEmailHtml({
      origin: "https://example.com",
      preheader: "p",
      title: "t",
      eyebrow: "e",
      headlineHtml: "h",
      leadHtml: "l",
      rows: [],
      button: { label: "b", href: "https://example.com" },
      panel: { label: "p", text: "t" },
      addressLine: "a",
      unsubscribeUrl: "https://example.com/u",
    }),
    /email-hero-telluride\.jpg/,
  );
});

/* -- the lines themselves ------------------------------------------------------ */

test("every sentence on the spring line is true of it", () => {
  const copy = [
    SPRING_BREAK_LINE.pickerNote,
    SPRING_BREAK_LINE.packagesNote,
    SPRING_BREAK_LINE.identityUse,
    SPRING_BREAK_LINE.legalNameHint,
    SPRING_BREAK_LINE.recordsHint,
    SPRING_BREAK_LINE.flightsWhy,
    SPRING_BREAK_LINE.flightsLead ?? "",
    SPRING_BREAK_LINE.flightGuideHas,
  ].join(" ");
  assert.doesNotMatch(copy, NOT_SPRING);
  assert.doesNotMatch(copy, NEVER);
  assert.equal(lineForDestination("Seed Beach, Punta Cana").id, "spring-break");
  assert.equal(lineForDestination("Telluride, Colorado").flightGuidePath, "/flights");
});
