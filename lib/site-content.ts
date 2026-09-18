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
    title: "Small enough to know everyone",
    body:
      "Every trip gets its size before it goes on sale, and it stays that size. You share a room with three friends or with one, or take a whole suite for six or eight. Where there's a guide, it's one for every six of you. By night two it feels like your crew took over the town.",
  },
  {
    eyebrow: "Hosted",
    title: "Every detail, handled",
    body:
      "We scout the hotels, the restaurants and the mountain long before a trip goes on sale, and we only work with places that hold a real standard. When you arrive, your room is ready and your plans are made. Our team knows your name and stays with you the whole trip, so there's always someone to text.",
  },
  {
    eyebrow: "One price",
    title: "One price, all in",
    body:
      "Lodging, activities, ground transport, private events, a welcome package and our staff are all in the price. No resort fee at check-in and no surprise shuttle charge. Everyone books and pays for their own spot, all at once or in installments, so nobody fronts the money for friends and nobody spends March chasing the group chat.",
  },
  {
    eyebrow: "We go first",
    title: "We've been there first",
    body:
      "Before a trip goes on sale, we've stayed at the property, held the rooms, bought the tickets and lined up the rides. Then we come along for the whole thing. The friend who usually plans everything finally gets to just be on the trip.",
  },
];

/* -- brand origin ---------------------------------------------------------- */
export const ORIGIN = {
  title: "Why Outrider",
  lede:
    "An outrider is the one who goes first. They ride ahead of the group, scout the route and have everything ready before anyone else arrives. That's our job on every trip.",
  /* Carter's words lead this, and they are the argument the company is built
   * on: the destination is the product. It opens on what a college trip should
   * feel like rather than on what is wrong with the usual one: the marketing
   * lead asked for the earnest version first, and the side-by-side table below
   * it already carries the contrast. The logistics paragraph follows, because
   * how a trip is run is the consequence of choosing the place, not the reason. */
  body: [
    "A trip with your friends should be the best week of your year. A place you've wanted to see for ages, somewhere to stay you'd happily tell your parents about, and everyone you like in one town at the same time.",
    "So we start with the place. A mountain worth skiing, a town worth walking, a dinner nobody leaves early. We build the whole trip around it.",
    "That one decision shapes the rest. We choose the property first and book it for the whole group, which is what sets the size of every trip. And a trip only goes on sale once one of us has walked the town, eaten the dinners and slept in the rooms.",
    "Then we take care of everything else. Reservations and activities set before anyone lands, rides both directions, our team on the ground all week, and one price paid up front or in installments. The logistics are our job, so the trip can be all yours.",
    "What's left is the part worth flying for.",
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
    usual: "A low number up front, then lift tickets, rentals, transfers and resort fees on top.",
    ours: "One price per person with everything in it. The number on the trip page is the whole trip.",
  },
  {
    label: "Where you stay",
    usual: "Your group split across rentals around town, sorted by whoever booked first.",
    ours: "One property for the whole group. Everyone under the same roof, walking distance from the same lift.",
  },
  {
    label: "Lift tickets and gear",
    usual: "Bought one at a time at the window, on the first morning, in line.",
    ours: "Three-day lift tickets and rentals ready before you land, with performance rentals on the upper tiers.",
  },
  {
    label: "Getting there",
    usual: "Everyone sorts out their own ride from the airport.",
    ours: "Ground transport both directions is arranged and included, shared or private depending on your package.",
  },
  {
    label: "Paying for it",
    usual: "One friend fronts the money and spends months chasing the group chat.",
    ours: "Everyone books their own spot. A deposit holds it and the rest comes in scheduled payments, or pay in full when you book. Nobody owes a friend a thing.",
  },
  {
    label: "On the trip",
    usual: "Whoever planned it spends the week as the help desk.",
    ours: "Our team is with you the whole trip, so the friend who planned it finally gets to ski.",
  },
  {
    label: "How many people",
    usual: "As many as will pay.",
    ours: "Set before a single spot goes on sale. Rooms for four or two, suites taken whole by six or eight, and one instructor for every six.",
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
    note: "Somewhere warm, hosted the same way. We'll stay there first, keep the group small and plan the days, so all you have to pack is sunscreen.",
  },
];

/* -- what every Telluride package includes ----------------------------------
 * Shown on /telluride under #included, the anchor the booking emails link to.
 * Each line restates something the site already promises (VALUE_PROPS,
 * COMPARISON, the FAQ), so this list adds no new claim. What differs between
 * packages comes from the tiers in the database, not from here.
 * ------------------------------------------------------------------------- */
export const SHARED_INCLUSIONS = [
  "Lodging at one property, booked whole for the group",
  "Lift tickets and rentals, arranged before you land",
  "Ground transport between Montrose and Telluride, both directions",
  "The private events on the itinerary",
  "A welcome package",
  "Outrider staff on the ground for the whole trip",
];

/* -- Telluride, the place -----------------------------------------------------
 * Verified against Telluride Ski Resort's own mountain page and Colorado Ski
 * Country, September 2026. Shared by /destinations and /telluride so the two
 * pages cannot quote different numbers. Numbers on a marketing page age, so
 * they live here in one block rather than being scattered through the prose.
 * ------------------------------------------------------------------------- */
export const TELLURIDE_FACTS = [
  { value: "2,000", label: "Skiable acres", note: "127 trails, 41 percent of them advanced or expert" },
  { value: "13,150 ft", label: "Summit", note: "Base at 8,725 feet, so the town itself sits high" },
  { value: "330 in", label: "Average annual snowfall", note: "San Juans catch more of it than the Front Range" },
  { value: "Free", label: "The gondola", note: "The only free transport system of its kind in North America" },
];

/* -- where the group stays --------------------------------------------------
 * The property is the owner's (September 2026). What is said about it is
 * limited to what the resort itself publishes: it is in Mountain Village,
 * ski-in and ski-out, with a spa. Shown on /telluride only once trip details
 * are public, alongside the packages.
 * ------------------------------------------------------------------------- */
export const TELLURIDE_PROPERTY = {
  name: "The Peaks Resort",
  where: "Mountain Village, Telluride",
  body: [
    "The whole group stays under one roof at The Peaks Resort, up in Mountain Village rather than down in the canyon. It is ski-in and ski-out, so the day starts at the door rather than in a shuttle queue, and it has its own spa for the afternoon after.",
    "Town is one free gondola ride down. It runs until midnight, so dinner on main street and getting back up the hill afterwards are the same easy trip.",
  ],
};

/* -- how the rooms work ------------------------------------------------------
 * The rooming behind each package, stated without the package names, which the
 * team edits in /admin and which can change without this file knowing. As of
 * September 2026: the first two packages share the same Two King room, with
 * four people or with two, and the top package is a private suite taken whole.
 * If that changes, change it here and in COMPARISON, VALUE_PROPS and the FAQ.
 * ------------------------------------------------------------------------- */
export const TELLURIDE_ROOMS = [
  {
    label: "Four to a room",
    body: "A Two King room shared by four, two to a bed. Where every package starts.",
  },
  {
    label: "Two to a room",
    body: "The same Two King room shared by two, so each of you has a king bed of your own.",
  },
  {
    label: "A suite to yourselves",
    body: "A private suite booked whole, for a group of six or eight who want the door to close on just them.",
  },
];

/** The one thing deliberately left out, said next to the list above. */
export const NOT_INCLUDED_NOTE =
  "Flights are not included. Everyone books their own, into Montrose.";
