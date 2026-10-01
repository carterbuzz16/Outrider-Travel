/**
 * Copy and facts that live outside the database.
 *
 * House style, so this stays consistent as it grows:
 *   - No em dashes. Use a comma, a full stop, or rewrite the sentence.
 *   - Positioning words are allowed where they say who we are (Carter, 1
 *     October 2026): exclusive, elevated, luxury. Sparingly, and never as
 *     filler in place of a fact.
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
  responseTime: "We reply within a day.",
};

/* -- the home page ---------------------------------------------------------------
 * Rebuilt 1 October 2026 from three research passes (Palm Tree Crew; Surf
 * Lodge, Soho House, Aman and others; Flash Pack, Deer Valley, Black Tomato,
 * Contiki) after Carter said the home page still didn't feel right and should
 * be simple, few words, enough to pique interest, about Outrider the brand,
 * and without clubs. What the best of them share, and this follows:
 *   - the first screen is a film of people, with almost no words on it;
 *   - one loud line per page (ours: the brand book's "We host. You show up."),
 *     everything else quiet;
 *   - the trip arrives on screen two with hard facts (the hotel by name, the
 *     dates, what's in it, the price), not adjectives;
 *   - a seasonal pair (Surf Lodge's "Summer in Montauk / Winter in Aspen");
 *   - short: no business pitch and no long form on the home page.
 * Every line is already promised elsewhere on the site; nothing new is
 * claimed. The stock friend groups are never captioned as Outrider guests.
 * ------------------------------------------------------------------------- */
export const HOME = {
  headline: "We host. You show up.",
  // Carter, 1 October 2026: "the exclusive, elevated college trip. It's like
  // luxury." His words, and the one place the home page says what we are.
  tagline: "The exclusive, elevated college trip.",
  peaks: {
    title: "Ski-in, ski-out at The Peaks",
    // Each restates a line of TRIP_WHAT_YOU_GET; change them together.
    lines: ["Lift tickets and rentals", "Private rides from Montrose", "An après party with a DJ", "Our team, all week"],
  },
  // "The luxury version of a college trip" is Carter's own line from the
  // chapter pitch (30 September 2026).
  why: {
    title: "The luxury version of a college trip",
    line: "Small groups, one price, one roof, and our team there all week.",
  },
  winter: { label: "This winter", title: "Telluride" },
  // No destination yet: nothing is announced (see UPCOMING_CATEGORIES).
  spring: { label: "This spring", title: "Spring break", line: "2027. Destination soon." },
  closing: "Four nights in Telluride",
};

/* -- spring break ----------------------------------------------------------------
 * /spring-break (1 October 2026). Carter: one list that everyone gets, but the
 * spring break way in branded as its own thing, "Outrider Spring Break Club".
 * A signup from it lands on the same list with placement "spring-break",
 * which sends the spring break welcome (lib/email/send.ts) instead of the
 * Telluride one. No destination is announced (UPCOMING_CATEGORIES), so
 * nothing here names a place or a price; it promises only what every trip
 * already is.
 * ------------------------------------------------------------------------- */
export const SPRING_BREAK_PLACEMENT = "spring-break";

export const SPRING_BREAK = {
  club: "Outrider Spring Break Club",
  headline: "Spring break",
  tagline: "2027. Somewhere warm. Destination soon.",
  pitchTitle: "Hosted the way we host Telluride",
  pitch:
    "One great place for the whole group, one price with everything in it, and our team there all week. Get on the list and you'll hear where we're going before anyone else.",
  formHeading: "Get in early",
  formBody: "The list hears where first. It's the same list as every Outrider trip, so you'll hear about the rest too.",
  doneHeading: "You're in the club",
  doneBody: "We'll write the moment spring break is announced, before it reaches the site. A welcome note is on its way to your inbox.",
  shareText: "Outrider is planning spring break 2027. Get on the list and hear where first.",
};

/* -- what makes Outrider different ------------------------------------------
 * Describes how the company operates, not one destination. Every claim is
 * backed by the tier inclusions in the database.
 * ------------------------------------------------------------------------- */
export const VALUE_PROPS = [
  {
    eyebrow: "Small groups",
    title: "Familiar faces by day two",
    // "Open to every school" is the other half of small (Carter's mission,
    // 1 October 2026): exclusive by size, never by who you are.
    body:
      "Every trip is sized before it goes on sale and stays that size, small enough that faces are familiar by day two. It's open to students from any school, so you come with your friends and leave knowing people from other campuses. Share a Two King room with three friends or one, or take a whole penthouse with seven.",
  },
  {
    eyebrow: "Hosted",
    title: "Your room's ready when you land",
    body:
      "We scout the hotels, the restaurants and the mountain long before a trip goes on sale, and we only work with places that hold a real standard. When you arrive, your room is ready and your plans are made. Our team knows your name and stays with you the whole trip, so there's always someone to ask.",
  },
  {
    eyebrow: "All in",
    title: "One price, all in",
    body:
      "Lodging, lift tickets and rentals, ground transport, the private events, a welcome package and our team are all in the price. No resort fee at check-in and no surprise shuttle charge. Everyone books and pays for their own spot, all at once or in installments, so nobody fronts the money for friends or spends the semester chasing Venmo requests.",
  },
  {
    eyebrow: "We go first",
    title: "We've been there first",
    body:
      "Before a trip goes on sale, we've stayed at the property, held the rooms, bought the tickets and lined up the rides. Then we come along for the whole thing.",
  },
];

/* -- the About page's five reasons -------------------------------------------
 * The main thing the About page has to do (Carter, 1 October 2026): show
 * plainly why Outrider beats the usual college trip. Five claims, each one a
 * headline in Extrabold capitals and two sentences under it, with a
 * photograph. Every line restates something the site already promises
 * (VALUE_PROPS, SHARED_INCLUSIONS, the ComparisonTable rows), so this adds no
 * new claim; change them together. No photograph repeats one used elsewhere
 * on /about.
 * ------------------------------------------------------------------------- */
export const ABOUT_DIFFERENCES: { title: string; body: string; image: { src: string; alt: string } }[] = [
  {
    title: "One price, everything in it",
    body: "Your room, three days of lift tickets and rentals, rides from Montrose, the parties and our team. Flights are the only thing you book, and there are no surprise fees at check-in.",
    image: {
      src: "/images/people/friends-snow-throw.jpg",
      alt: "Four friends on skis, arms linked, laughing as someone throws a handful of powder at them in falling snow.",
    },
  },
  {
    title: "The whole group under one roof",
    body: "Everyone stays at The Peaks, ski-in, ski-out. Walk out the door, click in, go. Pick a room for four or two, or take a whole penthouse with your eight.",
    image: {
      src: "/images/peaks/peaks-exterior-night.jpg",
      alt: "The Peaks Resort from above on a winter night, its windows lit and the heated outdoor pool glowing, with snowy peaks behind.",
    },
  },
  {
    title: "Small on purpose",
    body: "Every trip is capped before it goes on sale, so it never turns into a crowd. Anyone from any school can come, and by day two you know everybody.",
    image: {
      src: "/images/people/chairlift-dusk.jpg",
      alt: "Three snowboarders riding a chairlift up a darkening run at dusk, snowy pines on either side.",
    },
  },
  {
    title: "We've been there first",
    body: "We stayed at the hotel, held the rooms and lined up the rides before a single spot went on sale. Nothing on this trip is a guess.",
    image: {
      src: "/images/telluride/gondola-night.jpg",
      alt: "A gondola cabin crossing a snowy ridge, the town far below in the valley.",
    },
  },
  {
    title: "Our team, all week",
    body: "We're with you from pickup to drop-off. Everyone pays their own way, so nobody fronts the money, and the friend who planned it finally gets to ski.",
    image: {
      src: "/images/telluride/gorrono-deck.jpg",
      alt: "Gorrono Ranch's old timber barns mid-mountain, skiers in Adirondack chairs on the snow out front and the San Juans behind.",
    },
  },
];

/* -- brand origin ---------------------------------------------------------- */
export const ORIGIN = {
  title: "Why Outrider",
  lede:
    "An outrider is the one who goes first. They ride ahead of the group, scout the route and have everything ready before anyone else arrives. That's our job on every trip.",
  /* Trimmed to one paragraph on 1 October 2026, when the About page was
   * rebuilt to be easy to read: the place, the property and the logistics
   * now each have a line in ABOUT_DIFFERENCES, and the club paragraph went
   * when Carter said he didn't like the clubs. Carter's words lead this, and
   * they are the argument the company is built on: the destination is the
   * product. It opens on what a college trip should feel like rather than on
   * what is wrong with the usual one: the marketing lead asked for the earnest
   * version first, and the side-by-side comparison carries the contrast. */
  body: [
    "A trip with your friends should be the best week of your year. A place you've wanted to see for ages, somewhere to stay you'd happily tell your parents about, and everyone you like in one town at the same time.",
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
    // Carter to approve.
    "Social chair is the job nobody volunteers for twice.",
  bio: [
    "I went to Auburn, where I was social chair of ATO and then president. Between the two I planned more than thirty trips. Social chair is the job nobody volunteers for twice. You book the formals, move 200 people across state lines, chase deposits for months, and you're the one everybody texts when the rooms are wrong.",
    "Travel is the thing I care most about, and nearly everything I know about running a trip I learned by getting it wrong first, on somebody else's behalf. Being the person who has to fix it with 200 people already on the ground teaches you quickly what matters and what nobody notices.",
    "So Outrider is the company I would have booked. One price with everything already inside it. One property, held before it goes on sale. Someone on the ground for the whole trip. Nobody fronting money for their friends and spending the spring trying to get it back.",
    // Carter to approve.
    "College trips should be fun, and ours are. What I care about is where you wake up: a hotel you'd show your parents, a group small enough that faces are familiar by day two, and a town you'll still bring up years from now.",
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
    "Chptr runs the day-to-day for fraternities and sororities: events, dues, vendors. Its Collective is a short list of partners chapters can trust, and Outrider is the one for ski trips. If your chapter is on Chptr, we're already vetted.",
  ],
};

/* -- trips not yet in the database ------------------------------------------
 * Shown on /trips as honest "not open yet" entries. No prices and no CTA,
 * because neither exists yet. Delete an entry when a real trip is created.
 * ------------------------------------------------------------------------- */
export const UPCOMING_CATEGORIES = [
  {
    name: "Spring break",
    destination: "Destination to be announced",
    window: "Spring 2027",
    note: "Somewhere warm, hosted the way we host Telluride. We stay there first and keep the group small. The list hears where before anyone else.",
  },
];

/* -- what every Telluride package includes ----------------------------------
 * Shown on /telluride under #included, the anchor the booking emails link to.
 * Each line restates something the site already promises (VALUE_PROPS,
 * the ComparisonTable, the FAQ), so this list adds no new claim. What differs between
 * packages comes from the tiers in the database, not from here.
 * ------------------------------------------------------------------------- */
export const SHARED_INCLUSIONS = [
  // Ski-in, ski-out with every mention of The Peaks (Carter's rule), and this
  // is now the first line people read on /telluride.
  "Lodging at The Peaks, ski-in, ski-out, with the whole group under one roof",
  "Lift tickets and ski or snowboard rentals, ready before you land",
  "Ground transport between Montrose and Telluride, both directions",
  "Private events all week, including an après party with a DJ at Gorrono Ranch, mid-mountain",
  "Tables held for the group at restaurants in town, and drink vouchers for spots around Mountain Village",
  "A welcome package",
  "Our team on the ground for the whole trip",
];

/* -- the private events -------------------------------------------------------
 * What "private group events all week" in every package actually means, from
 * Carter's list (25 September 2026). Shown on /telluride under #events and as a
 * teaser on the home page, before launch as well: it is what the week feels
 * like, not what it costs, so it is not held back with the packages.
 *
 * Careful with what each line promises. Restaurant blocks are held tables, not
 * paid dinners (confirmed by Carter): meals are not covered, so the copy never
 * says dinner is. Around the village it is drink vouchers, not open tabs
 * (Carter, 25 September 2026), so never promise a tab or a set number. The
 * line names no age on purpose; Carter asked for it without 21-and-over wording. Night two is deliberately
 * unannounced: when it is set, fill in the title and body and remove `teaser`.
 * ------------------------------------------------------------------------- */
export type TripEvent = {
  /** Small label above the title: when, or where. */
  when: string;
  title: string;
  body: string;
  image: { src: string; alt: string };
  /** Focal point for the crop. */
  position?: string;
  /** Still under wraps: the card says so rather than inventing detail. */
  teaser?: boolean;
};

export const TELLURIDE_EVENTS: TripEvent[] = [
  {
    when: "Mid-mountain",
    title: "Après at Gorrono Ranch",
    body:
      // An après party with a DJ, never a BBQ (Carter, 25 September 2026).
      "One afternoon the whole group takes over Gorrono Ranch, the old homestead halfway down the mountain. A DJ on the deck, and everyone still in ski boots.",
    image: {
      src: "/images/telluride/gorrono-deck.jpg",
      alt: "Gorrono Ranch's old timber barns mid-mountain, skiers in Adirondack chairs on the snow out front and the San Juans behind.",
    },
  },
  {
    when: "Night two",
    title: "An Outrider night",
    body:
      "Night two is ours alone, a private event for the group and nobody else. We're keeping the details quiet for now. Travelers hear first.",
    image: {
      src: "/images/people/chairlift-dusk.jpg",
      alt: "Three snowboarders riding a chairlift up a darkening run at dusk, snowy pines on either side.",
    },
    teaser: true,
  },
  {
    when: "In town",
    title: "Tables held for the group",
    body:
      "We book blocks at restaurants in town before anyone lands, so dinner is a gondola ride down to a table that's already held. You order and pay as you go, without the wait list or the calling around.",
    image: {
      src: "/images/people/friends-candlelit-dinner.jpg",
      alt: "A group of friends in hoodies sharing dinner at a long candlelit table in a timber dining room.",
    },
  },
  {
    when: "Mountain Village",
    title: "Vouchers around the village",
    body:
      "When the lifts close, you'll have drink vouchers and a few extras for spots around Mountain Village, so the first round after skiing is already sorted.",
    image: {
      src: "/images/telluride/dining.jpg",
      alt: "A stone terrace in Mountain Village at dusk, fire tables glowing under the arches and trees wrapped in lights.",
    },
    position: "40% 50%",
  },
];

/* -- trip sponsors ------------------------------------------------------------
 * Brands supplying something to the group. Confirmed by Carter, 25 September
 * 2026. The brand writes its name "Sap's" (sapsoriginal.com), not "SAPS". The
 * logo is the file Carter supplied, transparent, used as is: never recolor it.
 * Say only what they supply: no health or hangover claims on their behalf.
 * ------------------------------------------------------------------------- */
export const TRIP_SPONSORS = [
  {
    name: "Sap's",
    url: "https://www.sapsoriginal.com/",
    supplies: "Electrolyte drinks for the group, all week",
    logo: { src: "/images/partners/saps.webp", width: 1125, height: 493 },
  },
];

/* -- the town after the lifts -------------------------------------------------
 * Checked 25 September 2026 against the sources beside each line. Only places
 * and facts a visitor can see for themselves; none of these are Outrider
 * events or partners, so nothing here promises a voucher or a table. Carter
 * wants this to be the bars and restaurants, not sightseeing, so a new line
 * should be somewhere to eat or drink.
 * ------------------------------------------------------------------------- */
export const TELLURIDE_TOWN = [
  {
    // telluride.com/discover/the-gondola: 6:30 am to midnight, free.
    name: "The gondola",
    body: "Free, 6:30 in the morning until midnight, from Mountain Village over the ridge and down into town.",
  },
  {
    // Wikipedia, Telluride Historic District: National Historic Landmark, 1961.
    name: "Main Street",
    body: "A National Historic Landmark District since 1961. Brick storefronts, holiday lights up all December, and the mountain rising straight out of the end of the street.",
  },
  {
    // newsheridan.com: bar open since 1895, original carved back bar.
    name: "The New Sheridan Bar",
    body: "Pouring since 1895, under the same carved wood back bar.",
  },
  {
    // Wikipedia, Telluride: San Miguel Valley Bank, June 1889.
    name: "Butch Cassidy's first bank",
    body: "In June 1889 he robbed the San Miguel Valley Bank and rode out of the canyon with $24,580.",
  },
  {
    // lastdollarsaloon.com: corner of Colorado Ave (Main Street) and Pine, building from 1899.
    name: "The Last Dollar Saloon",
    body: "The Buck, to anyone who lives here. A saloon in an 1899 building on the corner of Main and Pine.",
  },
  {
    // experiencethere.com/telluride: Asian-inspired small plates and cocktails, on Pacific Ave.
    name: "There",
    body: "Small plates and cocktails, one street off Main. Order a lot and share it.",
  },
  {
    // punchdrink.com, O'Bannon's: underground dive, live music, dance floor, arcade games.
    name: "O'Bannon's",
    body: "Down a flight of stairs in town: live music, a dance floor and arcade games.",
  },
];

/* -- Telluride, the place -----------------------------------------------------
 * Verified against Telluride Ski Resort's own Mountain Facts (2,000+ acres,
 * 148 trails, 41% advanced/expert, 280 in average snowfall, base 8,725 ft,
 * top 13,150 ft), 18 September 2026. Shared by /destinations and /telluride so the two
 * pages cannot quote different numbers. Numbers on a marketing page age, so
 * they live here in one block rather than being scattered through the prose.
 * ------------------------------------------------------------------------- */
export const TELLURIDE_FACTS = [
  { value: "2,000+", label: "Skiable acres", note: "148 trails, 41 percent of them advanced or expert" },
  { value: "13,150 ft", label: "Summit", note: "Base at 8,725 feet, so the town itself sits high" },
  { value: "280 in", label: "Average annual snowfall", note: "San Juans catch more of it than the Front Range" },
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
    "The whole group stays under one roof at The Peaks Resort, up in Mountain Village above the canyon. It's ski-in and ski-out, so the day starts at the door, and it has its own spa for the afternoon after.",
    "Town is one free gondola ride down. It runs until midnight, so dinner on Main Street and the ride back up are the same easy trip.",
  ],
};

/* -- how the rooms work ------------------------------------------------------
 * The rooming behind each package, stated without the package names, which the
 * team edits in /admin and which can change without this file knowing. As of
 * September 2026: the first two packages share the same Two King room, with
 * four people or with two, and at the top a group of eight chooses one of two
 * private four-bedroom penthouses, 702 or 830, and books it whole.
 * If that changes, change it here and in ComparisonTable, VALUE_PROPS and the FAQ.
 * ------------------------------------------------------------------------- */
export const TELLURIDE_ROOMS = [
  {
    label: "Four to a Room",
    body: "A Two King room shared by four, two to a bed. Where every package starts.",
  },
  {
    label: "Two to a Room",
    body: "The same Two King room shared by two, so each of you has a king bed of your own.",
  },
  {
    label: "A penthouse to yourselves",
    body: "A four-bedroom penthouse for your group of eight. December has two, 702 and 830. January has 702.",
  },
];

/* -- what you get, on a departure page ----------------------------------------
 * The "What you get" list on /trips/[id], above the rooms, so a visitor sees
 * everything a package comes with before any price. Carter's direction, 28
 * September 2026: a plain list of everything, ski-in, ski-out up front, no
 * slogan, no photographs, no stat band, nothing about fees.
 *
 * Every line restates something already promised, so it adds no claim:
 *   - ski-in, ski-out, said with every mention of The Peaks (Carter's rule);
 *   - three days of lift tickets and rentals: every tier on both departures
 *     (checked in the database, 28 September 2026); fitted before you land,
 *     skipping the rental line: the booking confirmation email;
 *   - the rides are for the group only (Carter, 21 September 2026);
 *   - the four events are TELLURIDE_EVENTS: the Gorrono party is an après with
 *     a DJ, never a BBQ, in new copy; tables are held, never paid for, so the
 *     line says you pay as you go; vouchers, never a tab;
 *   - Sap's is TRIP_SPONSORS; "pickup to drop-off" is the Telluride FAQ.
 *
 * `{nights}` in a title is filled from the trip's own dates. If a package
 * ever drops one of these, take the line out: this is what every package gets.
 *
 * /telluride uses the same list, and there the four lines with an `image` lead
 * as photographs (29 September 2026: Carter wanted the page an Instagram ad
 * lands on to show what you get at a glance). The departure page ignores
 * `image` and stays a plain list, as asked. The photographs are shown as
 * half-width tiles on a phone and every one has the pixels for that at 3x, so
 * none is upscaled (the blur Carter saw on an earlier version); none repeats
 * one used elsewhere on /telluride.
 * ------------------------------------------------------------------------- */
export const TRIP_WHAT_YOU_GET: { title: string; body: string; image?: { src: string; alt: string } }[] = [
  {
    title: "Ski-in, ski-out at The Peaks",
    body: "{nights} in Mountain Village, with the whole group under one roof.",
    image: {
      src: "/images/peaks/peaks-exterior-night.jpg",
      alt: "The Peaks Resort from above on a winter night, its windows lit and the heated outdoor pool glowing, with snowy peaks behind.",
    },
  },
  {
    title: "3 days of lift tickets and rentals",
    body: "Skis or a snowboard fitted before you land, so you skip the rental line.",
    image: {
      src: "/images/people/friends-snow-throw.jpg",
      alt: "Four friends on skis, arms linked, laughing as someone throws a handful of powder at them in falling snow.",
    },
  },
  { title: "Private rides", body: "From the Montrose airport to your hotel and back, just for the group." },
  {
    title: "Après party at Gorrono Ranch",
    body: "One afternoon mid-mountain, with a DJ, the whole group together.",
    image: {
      src: "/images/telluride/powder.jpg",
      alt: "Skiers on the sunny deck outside the old timber saloon at Gorrono Ranch, mid-mountain.",
    },
  },
  { title: "A private Outrider night", body: "Night two is ours alone, just the group." },
  {
    title: "Tables held in town",
    body: "Restaurant blocks booked before you land. You order and pay as you go.",
    image: {
      src: "/images/telluride/groomers.jpg",
      alt: "Telluride's brick Main Street and clock tower, a snow-covered peak rising straight up behind.",
    },
  },
  { title: "Drink vouchers", body: "For spots around Mountain Village, so the first round after skiing is sorted." },
  { title: "A welcome package", body: "Waiting in your room when you get there." },
  { title: "Electrolytes from Sap's", body: "For the whole group, all week." },
  { title: "Our team, all week", body: "On the ground with you from pickup to drop-off." },
];

/* -- the trip in five lines ------------------------------------------------
 * The first thing someone arriving from an ad reads on /telluride, under the
 * photograph and before the price (29 September 2026). Each value restates a
 * line of TRIP_WHAT_YOU_GET, so change the two together. The dates are added
 * by the page, from the published trips.
 * ------------------------------------------------------------------------- */
export const TELLURIDE_AT_A_GLANCE = [
  { label: "Stay", value: "The Peaks, ski-in, ski-out" },
  { label: "Ski", value: "3 days of lift tickets and rentals" },
  { label: "Rides", value: "Private, from Montrose and back" },
  { label: "Nights out", value: "An après party at Gorrono Ranch, and more" },
  { label: "Hosts", value: "Our team, on the ground all week" },
];

/** The one thing deliberately left out, said next to the list above. */
export const NOT_INCLUDED_NOTE =
  "Flights aren't included. Everyone books their own, into Montrose.";

/* -- travel insurance -------------------------------------------------------
 * Not in any package, and the thing people ask about within a minute of
 * paying. Faye is who we point at, and the URL is Outrider's affiliate link:
 * it carries commission, so DISCLOSURE ships with it everywhere it appears
 * (FTC endorsement guides, and the brand cannot afford to look like it is
 * hiding a kickback). One constant, so a new link is changed once.
 *
 * Nothing here promises coverage. What a policy actually covers is Faye's to
 * state on their own page, and the copy sends people there to read it.
 * ------------------------------------------------------------------------- */
export const TRAVEL_INSURANCE = {
  provider: "Faye",
  url: "https://www.withfaye.com/quote/offer?utm_campaign=carter.busby&utm_source=outrider.travel&utm_medium=bd-traveladvisors&utm_term=glinda",
  eyebrow: "Optional add-on",
  heading: "Cover the trip, if you want to",
  body: "Travel insurance isn't in any package. A ski trip has more that can go sideways than most, so we point people at Faye: quotes take about a minute, and they cover the usual suspects, canceled flights, delayed bags, and getting hurt on the mountain. What a plan actually covers is on their page. Read it before you buy.",
  cta: "Get a quote from Faye",
  /** One line, plain, wherever the link appears. Do not soften or drop it. */
  disclosure: "Faye is a partner of ours. We earn a commission if you buy through this link, and it costs you nothing extra.",
} as const;
