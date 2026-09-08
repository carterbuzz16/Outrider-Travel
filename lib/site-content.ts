/**
 * Copy and facts that live outside the database.
 *
 * House style, so this stays consistent as it grows:
 *   - No em dashes. Use a comma, a full stop, or rewrite the sentence.
 *   - No "curated", "seamless", "elevate", "crafted", "journey", "unlock",
 *     "designed to", "ensures", or "it's not just X, it's Y".
 *   - Concrete over evocative. "Fourteen people" beats "an intimate group".
 *   - Outrider runs ski weeks, spring break and formals. Copy outside a
 *     specific trip page should not read as though skiing is the whole company.
 *
 * Anything only the Outrider team can know is marked NEEDS REAL COPY.
 */

/* -- contact ---------------------------------------------------------------
 * bookings@outrider.travel is the one address the repo can vouch for: it is the
 * verified Resend sender in EMAIL_FROM_ADDRESS. Change it here if enquiries
 * should land somewhere else.
 * ------------------------------------------------------------------------- */
export const CONTACT = {
  email: "bookings@outrider.travel",
  /** NEEDS REAL COPY. Omitted from the page entirely while null. */
  phone: null as string | null,
  base: "Auburn, Alabama",
  /**
   * NEEDS REAL COPY. Required in two places before launch: CAN-SPAM obliges a
   * physical postal address on marketing email, and the privacy policy has to
   * name one for data requests. Every consumer of this renders nothing while it
   * is null, so filling it in here is the only change needed.
   * Format as separate lines, e.g. ["Outrider Travel Co.", "123 Example St",
   * "Washington, DC 20001"].
   */
  postalAddress: null as string[] | null,
  instagram: "https://www.instagram.com/outridertravel/",
  instagramHandle: "@outridertravel",
  responseTime: "We answer every message within a day.",
};

/* -- what makes Outrider different ------------------------------------------
 * Describes how the company operates, not one destination. Every claim is
 * backed by the tier inclusions in the database.
 * ------------------------------------------------------------------------- */
export const VALUE_PROPS = [
  {
    eyebrow: "Small groups",
    title: "The number of people is a decision, not a ceiling",
    body:
      "Most operators grow a trip until it stops selling. We cap it before it goes on sale, because a group you can actually know is the entire point. Rooms are booked for six or eight, and where there is a guide it is one per six. You will know everyone by the second day.",
  },
  {
    eyebrow: "High touch",
    title: "Invited, not signed up for",
    body:
      "Outrider is not a party trip. We work with properties and brands that hold a standard, and everything is arranged quietly in advance, so what you turn up to feels like something you were invited to. The group is small enough that the people running it know your name, and they are there for the whole trip rather than at the end of an email.",
  },
  {
    eyebrow: "One price",
    title: "The number on the page is the number",
    body:
      "Lodging, activities, ground transport, private events, a welcome package and on-trip staff are inside the price. No resort fee at check in. No separate charge for the shuttle. Each traveller books their own spot and pays in installments, so nobody fronts money for friends and nobody chases a group chat in March.",
  },
  {
    eyebrow: "Someone goes first",
    title: "The trip is scouted before it is sold",
    body:
      "We go to the property, hold the rooms, buy the tickets and arrange the transport before a single spot is offered. Outrider staff are there for the whole trip. Whoever would normally organise it gets to be on the trip instead of running it.",
  },
];

/* -- brand origin ---------------------------------------------------------- */
export const ORIGIN = {
  title: "Why Outrider",
  lede:
    "An outrider is the one who goes first. They ride ahead of the party, scout the route, clear what is in the way, and have the ground ready before anyone else arrives.",
  body: [
    "College group travel breaks in the same places every time. Twenty people spread across four rentals. Nobody bought tickets in advance. A group chat still arguing about money in March over a trip taken in January. The trip is rarely the problem. The logistics are.",
    "So Outrider runs the whole thing. One property, booked whole. Reservations and activities arranged before anyone lands. Transport both directions. Staff on the ground for the duration. Everything priced up front and paid in installments, so the cost is settled long before anyone gets on a plane.",
    "What is left is the part worth flying for.",
  ],
};

/* -- founder ---------------------------------------------------------------
 * Written from Carter's own notes and in the first person, so it should read
 * as him. He should still read it back and change anything that does not sound
 * like him before launch: it is his name on it.
 * ------------------------------------------------------------------------- */
export const FOUNDER: {
  name: string;
  role: string;
  portrait: { src: string; alt: string } | null;
  secondaryImage: { src: string; alt: string } | null;
  pullQuote: string;
  /** Shown straight away, above the fold of the leadership section. */
  story: string[];
  /** Behind a "Read bio" disclosure, for anyone who wants the whole thing. */
  bio: string[];
} = {
  name: "Carter Busby",
  role: "President and Founder",
  /* Action shots only. A studio headshot against a bedroom wall says
     "student"; a founder on a summit before sunrise says the thing the
     company is actually selling. */
  portrait: {
    src: "/images/team/carter-ridge.jpg",
    alt: "Carter Busby on a summit ridge above treeline.",
  },
  secondaryImage: null,
  pullQuote:
    "Everybody already knows what is wrong with booking travel in college. Nobody had bothered to fix it.",
  bio: [
    "I have been to twelve countries. Travel is the thing I care most about, and most of what I know about running a trip I learned by getting it wrong first, on behalf of other people, in college.",
    "I was social chair at ATO and then president, which meant I was the one booking formals, moving large groups, chasing deposits and answering the phone when something went wrong. I planned trips for people the whole way through school.",
    "What struck me was that everybody complained about the same handful of things and nobody did anything about them. They were not hard problems. They were just nobody's job. So I made them mine.",
    "You are going to have fun in college whether or not you book anything from me. That is not what I am selling. The difference I care about is between a weekend you half remember and a trip you are still talking about in ten years: where you stay, who is handling it, and the fact that none of it lands on you.",
    "A trip you take with your friends at this age stays with you. I wanted to build the company I would have booked, one you can hand your money to without wondering, where by the second day it is obvious you got more than you paid for.",
  ],
  story: [
    "I went to Auburn. I was social chair of my fraternity, and then president of it, which means I spent a good part of college booking travel for other people. Anyone who has done that job knows how it goes. You are chasing deposits, you are guessing at a total, and you are hoping the place looks like the photos.",
    "Everybody already knows what is wrong with it. Nobody had bothered to fix it. So I started Outrider to run these trips the way I wanted them run when I was the one organising them: one price, stated up front, with everything in it, and no line item that turns up later.",
    "The other half of it is what you actually get. We are not a party trip. We book real properties, we work with brands and hotels that hold a standard, and the trip is planned so it feels like something you were invited to rather than something you signed up for. If that is what you want out of travelling in college, that is what this is.",
    "You should finish an Outrider trip feeling like you got more than you paid for. Not less, and not something you have to talk yourself into.",
  ],
};

/* -- partner: Chptr --------------------------------------------------------
 * Description drafted from what Chptr publishes about itself at chptr.house:
 * a management platform for fraternity and sorority chapters, whose vendor
 * partnership programme is the "Chptr Collective". Their own brand styling is
 * "Chptr", not "CHPTR".
 *
 * NOTE FOR CARTER: the description of Chptr is theirs and is accurate as far
 * as their site goes, but the sentence describing the Outrider relationship is
 * the part only you can confirm. Read it, correct it if the arrangement is
 * different, and it is good to go.
 * ------------------------------------------------------------------------- */
export const PARTNER = {
  name: "Chptr",
  eyebrow: "In partnership with",
  url: "https://chptr.house/",
  confirmed: true,
  body: [
    "Chptr is the platform fraternity and sorority chapters use to run themselves: budgeting, events, attendance, records and the vendors they work with, in one place. Their vendor programme, the Chptr Collective, vets who chapters deal with and negotiates the terms centrally.",
    "Outrider works with Chptr because it puts us on the same footing as every other part of a chapter's operations. A social chair is not taking a stranger's word for it and wiring a deposit somewhere. They are booking through a system their chapter already runs on, with someone who has been checked before they ever got in front of them.",
  ],
};

/* -- the difference, side by side -------------------------------------------
 * Used on the About page. Every line on the Outrider side is something the
 * trip data or the tier inclusions actually back up, so this stays honest as
 * the product changes. The other column describes the usual state of affairs
 * rather than any named company.
 * ------------------------------------------------------------------------- */
/**
 * A designed graphic to use instead of the built comparison block.
 *
 * Set this and the About page renders the image; leave it null and it renders
 * the COMPARISON rows below as markup. Keeping both means the text version
 * stays as the accessible fallback and the source of truth for the claims.
 *
 * Export at 2x for the container (about 1600px wide is plenty), and supply
 * `alt` that states the comparison in words, because an image of a table is
 * invisible to a screen reader and to search.
 */
export const COMPARISON_IMAGE: { src: string; alt: string; width: number; height: number } | null =
  null;

export const COMPARISON = [
  {
    label: "The price",
    usual: "A headline number, then lift tickets, rentals, transfers and resort fees on top. Nobody knows the real total until it is spent.",
    ours: "One price per person with everything in it. What you see on the trip page is what the trip costs.",
  },
  {
    label: "Where you stay",
    usual: "Twenty people spread across four rentals on the wrong side of town, sorted by whoever booked first.",
    ours: "One property, booked whole. Everyone is under the same roof, walking distance from the same lift.",
  },
  {
    label: "Lift tickets and gear",
    usual: "Bought individually, at the window, on the first morning, in the line.",
    ours: "Three-day tickets and rentals arranged before you land, with a valet fitting slot on the upper tiers.",
  },
  {
    label: "Getting there",
    usual: "Everyone books their own ride from the airport and hopes the timing works.",
    ours: "Ground transport both directions is arranged and included, shared or private depending on your package.",
  },
  {
    label: "Paying for it",
    usual: "One person fronts the money and spends the next three months chasing a group chat.",
    ours: "Each traveller books their own spot. A deposit holds it, the balance is split into scheduled payments, and nobody owes a friend anything.",
  },
  {
    label: "On the trip",
    usual: "Whoever organised it becomes the help desk for four days and never really gets a holiday.",
    ours: "Outrider staff are on the ground for the duration. The person who organised it gets to actually ski.",
  },
  {
    label: "How many people",
    usual: "As many as will pay, because volume is the business model.",
    ours: "Capped by design. Suites are booked as buyouts for six or eight, and guiding is one instructor per six.",
  },
];

/* -- trips not yet in the database ------------------------------------------
 * Shown on /trips as honest "not open yet" entries. No prices and no CTA,
 * because neither exists yet. Delete an entry when a real trip is created.
 * ------------------------------------------------------------------------- */
export const UPCOMING_CATEGORIES = [
  {
    name: "Spring break",
    destination: "Destination to be announced",
    window: "Spring 2027",
    note: "Warm water, same format. One property, one small group, everything handled before anyone lands.",
  },
  {
    name: "Formals",
    destination: "Destination to be announced",
    window: "2027",
    note: "Chapter and organisation trips, planned and staffed the way the ski weeks are.",
  },
];
