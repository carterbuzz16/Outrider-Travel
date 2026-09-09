/**
 * Copy and facts that live outside the database.
 *
 * House style, so this stays consistent as it grows:
 *   - No em dashes. Use a comma, a full stop, or rewrite the sentence.
 *   - No "curated", "seamless", "elevate", "crafted", "journey", "unlock",
 *     "designed to", "ensures", or "it's not just X, it's Y".
 *   - Concrete over evocative. "Fourteen people" beats "an intimate group".
 *   - Outrider runs ski weeks and spring break trips. Copy outside a
 *     specific trip page should not read as though skiing is the whole company.
 *
 * Anything only the Outrider team can know is marked NEEDS REAL COPY.
 */

/* -- the company ------------------------------------------------------------
 * The registered entity. Used wherever a document has to name the party a
 * traveler is contracting with or releasing, so the terms, the privacy policy
 * and the waiver cannot drift apart from each other or from the footer. A
 * release that names an entity which does not exist is worth less than one that
 * names the right one, so this is the only place it should ever be written.
 * ------------------------------------------------------------------------- */
export const LEGAL_NAME = "Outrider Travel, LLC";

/* -- contact ---------------------------------------------------------------
 * bookings@outrider.travel is the one address the repo can vouch for: it is the
 * verified Resend sender in EMAIL_FROM_ADDRESS. Change it here if inquiries
 * should land somewhere else.
 * ------------------------------------------------------------------------- */
export const CONTACT = {
  email: "bookings@outrider.travel",
  /** NEEDS REAL COPY. Omitted from the page entirely while null. */
  phone: null as string | null,
  base: "Auburn, Alabama",
  /**
   * Deliberately not surfaced in the layout. It appears in exactly two places,
   * both of which are obligations rather than marketing: the privacy policy's
   * contact section, because a policy has to name a physical address for data
   * requests, and the footer of marketing email, because CAN-SPAM requires one
   * there. It is not in the site footer or on the contact page.
   */
  postalAddress: [
    "145 East Magnolia Avenue",
    "Auburn, Alabama 36830",
  ] as string[] | null,
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
      "Most operators grow a trip until it stops selling. We cap it before it goes on sale and the number does not move to fit demand. Rooms are booked for four, six or eight, and where there is a guide it is one per six, so the people you actually spend the days with are a handful rather than a crowd.",
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
      "Lodging, activities, ground transport, private events, a welcome package and on-trip staff are inside the price. No resort fee at check in. No separate charge for the shuttle. Each traveler books their own spot and pays in installments, so nobody fronts money for friends and nobody chases a group chat in March.",
  },
  {
    eyebrow: "Someone goes first",
    title: "The trip is scouted before it is sold",
    body:
      "We go to the property, hold the rooms, buy the tickets and arrange the transport before a single spot is offered. Outrider staff are there for the whole trip. Whoever would normally organize it gets to be on the trip instead of running it.",
  },
];

/* -- brand origin ---------------------------------------------------------- */
export const ORIGIN = {
  title: "Why Outrider",
  lede:
    "An outrider is the one who goes first. They ride ahead of the party, scout the route, clear what is in the way, and have the ground ready before anyone else arrives.",
  /* Carter's words lead this, and they are the argument the company is built
   * on: the destination is the product. The logistics paragraph used to open
   * here and now follows, because how a trip is run is the consequence of that
   * choice rather than the reason for it. */
  body: [
    "Student group travel has run on the same formula for twenty years: fill the cheapest hotel with as many people as possible and sell the party. That formula no longer matches what this generation of students actually wants.",
    "They want the place. A mountain worth skiing, a town worth walking, a dinner nobody leaves early. So we build the trip around the destination instead of the crowd.",
    "That one decision sets everything after it. The property is chosen first and booked whole, which is what fixes the size of the group, rather than selling spots until the rooms run out. A departure only goes on sale once somebody has walked the place, eaten the dinners and slept in the rooms.",
    "Everything after that exists to serve it. Reservations and activities arranged before anyone lands, transport both directions, staff on the ground for the duration, one price settled up front and paid in installments. Not because logistics are the product, but because they are what usually stands between a group and the place they came for.",
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
  /** One condensed piece. Previously split across two arrays that told the
   *  same story twice and repeated the pull quote almost word for word. */
  bio: string[];
} = {
  name: "Carter Busby",
  role: "President and Founder",
  portrait: {
    src: "/images/team/carter-ridge.jpg",
    alt: "Carter Busby on a summit ridge above treeline.",
  },
  secondaryImage: null,
  pullQuote:
    "Everybody already knows what is wrong with booking travel in college. Nobody had bothered to fix it.",
  bio: [
    "I went to Auburn, where I was social chair of ATO and then president. Between the two I planned more than thirty trips. Social chair is the job nobody volunteers for twice. You book the formals, move 200 people across state lines, chase deposits for months, and you're the one everybody texts when the rooms are wrong.",
    "Travel is the thing I care most about, and nearly everything I know about running a trip I learned by getting it wrong first, on somebody else's behalf. Being the person who has to fix it with 200 people already on the ground teaches you quickly what matters and what nobody notices.",
    "So Outrider is the company I would have booked. One price with everything already inside it. One property, held before it goes on sale. Someone on the ground for the whole trip. Nobody fronting money for their friends and spending the spring trying to get it back.",
    "This isn't your typical party trip. Sure, college is all about having fun, and there will be plenty of that with Outrider, but what we care most about is your experience. That high-end exclusive feel you've been chasing. The part worth paying for is a place that holds a standard, a group small enough to actually know, and a few days you're still talking about in ten years.",
  ],
};

/* -- partner: Chptr ---------------------------------------------------------
 * Carter's copy, confirmed with Chptr. The order matters: Chptr the platform,
 * then the Collective, then where Outrider sits inside it.
 * ------------------------------------------------------------------------- */
export const PARTNER = {
  name: "Chptr",
  eyebrow: "Vetted partner",
  url: "https://chptr.house/",
  confirmed: true,
  body: [
    "Chptr is the all-in-one operations platform built for fraternities and sororities. Organizations use Chptr to manage everything from communication, attendance and events to payments and vendors, giving leaders one place to manage their chapters.",
    "Through the Chptr Collective, fraternities and sororities are connected with trusted, vetted partners across the services they already need, taking the guesswork out of finding the right vendors.",
    "Outrider is Chptr's vetted ski trip and mountain travel partner within the Collective. When it is time for group travel, organizations have a trusted partner already in place, one that specializes in creating group travel experiences for college students.",
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
    ours: "Each traveler books their own spot. A deposit holds it, the balance is split into scheduled payments, and nobody owes a friend anything.",
  },
  {
    label: "On the trip",
    usual: "Whoever organized it becomes the help desk for four days and never really gets a holiday.",
    ours: "Outrider staff are on the ground for the duration. The person who organized it gets to actually ski.",
  },
  {
    label: "How many people",
    usual: "As many as will pay, because volume is the business model.",
    ours: "Capped by design. Suites are booked as buyouts for four, six or eight, and guiding is one instructor per six.",
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
    note: "Somewhere warm, with the same standard applied. Real properties, a group small enough to know, and days worth flying for rather than just surviving.",
  },
];
