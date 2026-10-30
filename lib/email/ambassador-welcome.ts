import { BRAND, emailButton, renderEmailLayout } from "@/lib/email/layout";

/*
 * "Welcome to Outrider", the note each ambassador gets once they are on the
 * roster (Carter, 29 October 2026). Sent only from /admin/ambassadors, one at
 * a time or to a selection, and never twice: ambassadors.welcome_email_sent_at
 * is claimed before the send (app/admin/ambassadors/actions.ts).
 *
 * The copy is Carter's, word for word, with his edits after the first test
 * (the "why" paragraph signed, the free trip in bold capitals, the kickoff
 * called an optional Q&A). The only button is the dashboard; it
 * signs in the normal way (an emailed code for this address), so the email
 * carries no password and no sign-in token of its own.
 *
 * Pure: everything it needs comes in, so the admin preview (lib/email/catalog)
 * and the tests render exactly what is sent.
 */

/** The kickoff call, Sunday 1 November, 8 pm ET (Carter's Google Calendar event). */
export const KICKOFF_URL =
  "https://calendar.google.com/calendar/event?action=TEMPLATE&tmeid=NGMzZ3VtcWdnY284OHIzb3JnZGtvMnV2NmggY2FydGVyQG91dHJpZGVyLnRyYXZlbA&tmsrc=carter%40outrider.travel";

/** Replies go to Carter, who signs it. */
export const WELCOME_REPLY_TO = "carter@outrider.travel";

export type AmbassadorWelcomeInput = {
  name: string;
  school: string | null;
  code: string;
  /** The dashboard on the site the email is sent from: https://outrider.travel/ambassador/dashboard. */
  dashboardUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "Jade De Jesus" is Jade; "Mary Elizabeth Cole" is Mary Elizabeth.
const SURNAME_PARTICLES = new Set(["de", "del", "della", "da", "di", "du", "la", "le", "van", "von", "der", "st", "san"]);

/**
 * How the email greets them. A two-word name is its first word. A longer one
 * keeps a double first name (Mary Elizabeth, Avery Kate, Emalie Jade), unless
 * the middle word starts a surname (Jade De Jesus).
 */
export function welcomeFirstName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "there";
  if (parts.length >= 3 && !SURNAME_PARTICLES.has(parts[1].toLowerCase())) return `${parts[0]} ${parts[1]}`;
  return parts[0];
}

export function renderAmbassadorWelcome(input: AmbassadorWelcomeInput): { subject: string; html: string; text: string } {
  const first = welcomeFirstName(input.name);
  const school = input.school?.trim() || null;
  const code = input.code.toUpperCase();
  const shownUrl = input.dashboardUrl.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const e = escapeHtml;

  const p = (html: string, style = "") => `<p style="margin:0 0 16px 0;${style}">${html}</p>`;
  const bodyHtml = [
    p(`${e(first)},`),
    p(school ? `You&rsquo;re an Outrider ambassador for ${e(school)}.` : "You&rsquo;re an Outrider ambassador."),
    p(
      "A quick note on why Outrider exists. I was social chair and then president of ATO at Auburn, and I saw how college trips get run: the cheapest hotel, the biggest party, and hope nothing goes wrong. I started Outrider to be the other version: small groups, somewhere special, and a high-end hotel that&rsquo;s actually worth it. It&rsquo;s not the cheap option, and it&rsquo;s a trip worth bragging about. Tell that story when your friends ask.",
      "margin-bottom:6px;",
    ),
    p("&mdash; Carter, founder of Outrider", `color:${BRAND.muted};`),
    p("Everything you need lives on your dashboard."),
    `<div style="margin:0 0 12px 0;">${emailButton("Open your dashboard", e(input.dashboardUrl))}</div>`,
    p(`${e(shownUrl)}. Sign in with this email address.`, "font-size:14px;"),
    p(`<strong>Your code:</strong> ${e(code)}. Friends enter it in the ambassador code box at checkout.`, "margin-top:28px;"),
    p(
      "<strong>The deal:</strong> $100 off your Telluride trip for every friend who books with your code and pays by November 14. <strong>GET 5 FRIENDS SIGNED UP, AND IT&rsquo;S FREE.</strong> Your spot is held, no deposit.",
    ),
    p(
      "<strong>First thing today:</strong> post an Instagram story. Share one of our posts from @outridertravel or use a graphic from your dashboard, add your code, and tag @outridertravel. We repost ambassadors.",
    ),
    p(
      `<strong>Kickoff:</strong> Sunday, November 1, 8:00 pm ET, 30 minutes. It&rsquo;s a Q&amp;A for anyone who wants to join, and I&rsquo;ll be on to answer questions. <a href="${e(KICKOFF_URL)}" target="_blank" style="text-decoration:underline;">Add to calendar</a>`,
    ),
    p("Telluride runs December 14&ndash;18 and January 4&ndash;8 at The Peaks Resort &amp; Spa. Signups close November 14."),
    p("Glad you&rsquo;re here."),
    p("Carter Busby<br />President, Outrider<br />256-929-9189", "margin-bottom:0;"),
  ].join("\n");

  const text = [
    `${first},`,
    "",
    school ? `You're an Outrider ambassador for ${school}.` : "You're an Outrider ambassador.",
    "",
    "A quick note on why Outrider exists. I was social chair and then president of ATO at Auburn, and I saw how college trips get run: the cheapest hotel, the biggest party, and hope nothing goes wrong. I started Outrider to be the other version: small groups, somewhere special, and a high-end hotel that's actually worth it. It's not the cheap option, and it's a trip worth bragging about. Tell that story when your friends ask.",
    "— Carter, founder of Outrider",
    "",
    "Everything you need lives on your dashboard.",
    "",
    `Open your dashboard: ${input.dashboardUrl}. Sign in with this email address.`,
    "",
    `Your code: ${code}. Friends enter it in the ambassador code box at checkout.`,
    "The deal: $100 off your Telluride trip for every friend who books with your code and pays by November 14. GET 5 FRIENDS SIGNED UP, AND IT'S FREE. Your spot is held, no deposit.",
    "First thing today: post an Instagram story. Share one of our posts from @outridertravel or use a graphic from your dashboard, add your code, and tag @outridertravel. We repost ambassadors.",
    `Kickoff: Sunday, November 1, 8:00 pm ET, 30 minutes. It's a Q&A for anyone who wants to join, and I'll be on to answer questions. Add to calendar: ${KICKOFF_URL}`,
    "",
    "Telluride runs December 14–18 and January 4–8 at The Peaks Resort & Spa. Signups close November 14.",
    "",
    "Glad you're here.",
    "",
    "Carter Busby",
    "President, Outrider",
    "256-929-9189",
  ].join("\n");

  return {
    subject: `Welcome to Outrider, ${first}`,
    html: renderEmailLayout({
      eyebrow: "Outrider ambassadors",
      headline: "Welcome to Outrider",
      preheader: school ? `You're an Outrider ambassador for ${school}.` : "You're an Outrider ambassador.",
      bodyHtml,
      footerNote: "You’re getting this because you were selected as an Outrider ambassador.",
    }),
    text,
  };
}
