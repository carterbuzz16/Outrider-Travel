/*
 * "Welcome to Outrider" (lib/email/ambassador-welcome.ts): the greeting, the
 * copy Carter wrote, and that nothing from an ambassador's row can inject
 * markup. The admin preview and the real send both render through this.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { KICKOFF_URL, renderAmbassadorWelcome, welcomeFirstName } from "@/lib/email/ambassador-welcome";

const DASHBOARD = "https://outrider.travel/ambassador/dashboard";

test("greets by first name, keeping a double first name but not a surname particle", () => {
  assert.equal(welcomeFirstName("Brianna Bello"), "Brianna");
  assert.equal(welcomeFirstName("Mary Elizabeth Cole"), "Mary Elizabeth");
  assert.equal(welcomeFirstName("Avery Kate Lee"), "Avery Kate");
  assert.equal(welcomeFirstName("Emalie Jade Tackett"), "Emalie Jade");
  assert.equal(welcomeFirstName("Jade De Jesus"), "Jade");
  assert.equal(welcomeFirstName("Stella"), "Stella");
  assert.equal(welcomeFirstName("  Payton  "), "Payton");
  assert.equal(welcomeFirstName(""), "there");
});

test("subject, school, code and the dashboard link come from the row", () => {
  const email = renderAmbassadorWelcome({ name: "Annabella Weinsweig", school: "Kentucky", code: "weinsweig", dashboardUrl: DASHBOARD });
  assert.equal(email.subject, "Welcome to Outrider, Annabella");
  for (const part of [email.html, email.text]) {
    assert.match(part, /You.{1,7}re an Outrider ambassador for Kentucky\./);
    assert.ok(part.includes("WEINSWEIG"), "code is shown in capitals");
    assert.ok(part.includes("Signups close November 14."));
    assert.ok(part.includes("256-929-9189"));
  }
  assert.ok(email.html.includes(`href="${DASHBOARD}"`));
  assert.ok(email.html.includes("outrider.travel/ambassador/dashboard. Sign in with this email address."));
  assert.ok(email.html.includes(KICKOFF_URL.replace(/&/g, "&amp;")), "kickoff link, escaped once");
  assert.ok(email.text.includes(KICKOFF_URL));
});

test("no school on the row still reads as a sentence", () => {
  const email = renderAmbassadorWelcome({ name: "Isaac", school: null, code: "ISAACUW", dashboardUrl: DASHBOARD });
  assert.ok(email.text.includes("You're an Outrider ambassador.\n"));
  assert.ok(!email.html.includes("ambassador for ."));
});

test("a name or school with markup in it is escaped", () => {
  const email = renderAmbassadorWelcome({
    name: "<img src=x onerror=alert(1)> Smith",
    school: "<b>Auburn</b>",
    code: "TEST",
    dashboardUrl: DASHBOARD,
  });
  assert.ok(!email.html.includes("<img src=x"));
  assert.ok(!email.html.includes("<b>Auburn</b>"));
  assert.ok(email.html.includes("&lt;b&gt;Auburn&lt;/b&gt;"));
});

test("brand rules: no exclamation points, no middots, none of the banned words", () => {
  const email = renderAmbassadorWelcome({ name: "Brianna Bello", school: "Auburn", code: "BELLO", dashboardUrl: DASHBOARD });
  const visible = `${email.subject}\n${email.text}`;
  assert.ok(!visible.includes("!"));
  assert.ok(!visible.includes("·"));
  assert.ok(!email.html.includes("·") && !email.html.includes("&middot;"));
  assert.doesNotMatch(visible, /curated|bespoke|unforgettable/i);
});

test("Carter's edits: the signed paragraph, the free trip in capitals, the Q&A", () => {
  const email = renderAmbassadorWelcome({ name: "Brianna Bello", school: "Auburn", code: "BELLO", dashboardUrl: DASHBOARD });
  assert.ok(email.text.includes("Tell that story when your friends ask.\n— Carter, founder of Outrider\n"));
  assert.ok(email.html.includes("<strong>GET 5 FRIENDS SIGNED UP, AND IT&rsquo;S FREE.</strong>"));
  assert.ok(email.text.includes("It's a Q&A for anyone who wants to join, and I'll be on to answer questions."));
  assert.ok(email.html.includes("Q&amp;A"));
});
