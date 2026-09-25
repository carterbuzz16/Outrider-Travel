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
  responseTime: "We reply within a day.",
};

/* -- what makes Outrider different ------------------------------------------
 * Describes how the company operates, not one destination. Every claim is
 * backed by the tier inclusions in the database.
 * ------------------------------------------------------------------------- */
export const VALUE_PROPS = [
  {
    eyebrow: "Small groups",
    title: "Familiar faces by day two",
    body:
      "Every trip is sized before it goes on sale and stays that size, small enough that faces are familiar by day two. Share a Two King room with three friends or one, or take a whole penthouse with seven. Everyone you came with is under the same roof and at the same dinner table.",
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
    "So we start with the place and build the whole trip around it. In Telluride that means a box canyon, a mountain that climbs straight out of Main Street, and a free gondola between the two.",
    "That one decision shapes the rest. We choose the property first, with the whole group under one roof at The Peaks, which is what sets the size of every trip. And a trip only goes on sale once one of us has walked the town, eaten the dinners and slept in the rooms.",
    "Then we take care of everything else. Reservations and activities set before anyone lands, rides both directions, our team on the ground all week, and one price paid up front or in installments.",
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
  "Lodging with the whole group under one roof at The Peaks",
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
      "One afternoon the whole group takes over Gorrono Ranch, the old homestead halfway down the mountain. BBQ on the deck, a DJ, and everyone still in ski boots.",
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
