/*
 * Spring break's trip terms print a balance date (lib/spring-break-terms.ts), and
 * lib/installments.ts holds the date cards are actually charged. They are written
 * in two places, so this keeps them the same: a traveler is never told one date
 * and charged on another (Carter, 10 November 2026: "Final balance is due January
 * 8, 2027").
 *
 * lib/installments.ts is server-only (it reaches Stripe), so its table is read
 * from the source here rather than imported.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SPRING_BREAK_TERMS, SPRING_BREAK_TERMS_BALANCE_DATE } from "@/lib/spring-break-terms";
import { SPRING_BREAK_DATES_CONFIRMED, SPRING_BREAK_STARTS } from "@/lib/signup-deadline";
import { SKI, SPRING_BREAK_LINE } from "@/lib/trip-lines";

const installments = readFileSync(join(process.cwd(), "lib/installments.ts"), "utf8");

/** The dates a departure's balance is charged on, from INSTALLMENT_DATES_BY_START's source. */
function chargeDates(start: string): string[] {
  const table = installments.slice(installments.indexOf("INSTALLMENT_DATES_BY_START"));
  const row = table.match(new RegExp(`"${start}": \\[([^\\]]*)\\]`));
  assert.ok(row, `no installment dates for ${start}`);
  return [...row[1].matchAll(/"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
}

test("spring break is on sale", () => {
  assert.equal(SPRING_BREAK_DATES_CONFIRMED, true);
});

test("each spring break week's last charge is the balance date the trip terms print", () => {
  for (const start of SPRING_BREAK_STARTS) {
    const dates = chargeDates(start);
    assert.equal(dates[dates.length - 1], SPRING_BREAK_TERMS_BALANCE_DATE, start);
  }
  const printed = new Date(`${SPRING_BREAK_TERMS_BALANCE_DATE}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  assert.ok(
    SPRING_BREAK_TERMS.paragraphs.some((p) => p.includes(printed)),
    `the trip terms should say "${printed}"`,
  );
});

test("the box reads Carter's own words", () => {
  assert.equal(SPRING_BREAK_TERMS.agree, "I agree to the trip terms.");
  assert.equal(SPRING_BREAK_TERMS.paragraphs.length, 3);
  assert.ok(SPRING_BREAK_TERMS.paragraphs.every((p) => !p.includes("·")), "no middots");
});

test("Telluride still accepts the waiver, and spring break books on the Terms", () => {
  assert.equal(SKI.assumptionOfRisk, true);
  assert.equal(SPRING_BREAK_LINE.assumptionOfRisk, false);
});
