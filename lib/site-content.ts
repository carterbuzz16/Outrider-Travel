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
 * and, then, without clubs (they came back on 3 November 2026, as each trip's
 * identity). What the best of them share, and this follows:
 *   - the first screen is a film of people, with almost no words on it;
 *   - one loud line per page (ours was the brand book's "We host. You show
 *     up." until 26 October 2026, now "Go somewhere great."), everything else
 *     quiet;
 *   - the trip arrives on screen two with hard facts (the hotel by name, the
 *     dates, what's in it, the price), not adjectives;
 *   - a seasonal pair (Surf Lodge's "Summer in Montauk / Winter in Aspen");
 *   - short: no business pitch and no long form on the home page.
 * Every line is already promised elsewhere on the site; nothing new is
 * claimed. The stock friend groups are never captioned as Outrider guests.
 *
 * Two trips from 3 November 2026 (Carter: "we do ski, spring break, etc., not
 * just ski with spring break"). The seasonal pair and the hard facts became one
 * section, each trip's photograph over its own facts, because the same two
 * places twice on a short page would have doubled the words. About ninety in
 * all, no more than the page had with one trip. Carter's ask is "simple, not too
 * many words on the screen", so a new line here should replace one.
 * ------------------------------------------------------------------------- */
export const HOME = {
  // Carter, 26 October 2026, over "We host. You show up.": the headline says
  // where you go (anywhere good, any season); the tagline under it says what
  // kind of trip it is.
  headline: "Go somewhere great.",
  // Carter, 1 October 2026: "the exclusive, elevated college trip. It's like
  // luxury." His words, and the one place the home page says what we are.
  tagline: "The exclusive, elevated college trip.",
  // Same shape on purpose, so neither trip reads as the extra one. The place
  // comes from lib/trip-lines.ts, the dates and the price from the published
  // trips.
  trips: {
    ski: {
      season: "This winter",
      stay: "Ski-in, ski-out at The Peaks",
      // Each restates a line of TRIP_WHAT_YOU_GET; change them together.
      lines: ["Lift tickets and rentals", "Private rides from Montrose"],
      // Where the dates sit once both weeks have stopped selling (December 4).
      closed: "Booking closed",
    },
    springBreak: {
      season: "This spring",
      stay: "All-inclusive at Zemi Miches",
      // Each restates SPRING_BREAK. The first is there so nobody books expecting
      // to be in the Punta Cana hotel strip (see the note on SPRING_BREAK).
      lines: ["An hour and a half up the coast", "Airport transfers, both ways"],
    },
  },
  // "The luxury version of a college trip" is Carter's own line from the
  // chapter pitch (30 September 2026). "One roof" stayed out when this was cut
  // down: Telluride and Zemi Miches each say their own hotel just above it.
  why: {
    title: "The luxury version of a college trip",
    line: "Small groups, one price, our team all week.",
  },
  // Both trips are four nights. Was "Four nights in Telluride".
  closing: "Four nights with your friends",
};

/*
 * Spring break's two weeks, for pages that have to show them before the trips
 * are published (3 November 2026). Once a departure is published its page reads
 * the dates from the trip instead. If a date moves, change it here and in
 * /admin/trips.
 */
export const SPRING_BREAK_WEEKS = [
  { startDate: "2027-03-08", endDate: "2027-03-12" },
  { startDate: "2027-03-15", endDate: "2027-03-19" },
];
export const SPRING_BREAK_WHEN = "March 8 to 12 or March 15 to 19, 2027";

/* -- the campuses ---------------------------------------------------------------
 * The rolling list of schools (components/ui/CampusMarquee.tsx), from where our
 * ambassadors are (public.ambassadors, 3 November 2026). A short list by hand rather
 * than a live query, so a test row or a typo never reaches the page, and Carter can
 * take any name out.
 *
 * "The top 25 best universities, then leave the rest out" (Carter, 3 November 2026).
 * Chosen for reputation and for how well students know the name, and every one has
 * an ambassador. It is a judgment, not a published ranking, so never call it one. The
 * SEC schools come first (Carter, 3 November 2026), Texas and Oklahoma among them
 * since 2024, and the rest follow, strongest names first. Everyone else with an
 * ambassador is in MORE_CAMPUSES, which only /campuses shows.
 *
 * /campuses says "ambassador" and never "travelled from". He asked about schools
 * people have travelled from, but no trip has run: the first departs December 14,
 * 2026. Add that wording once trips have run and the bookings can back it.
 *
 * What the label may claim: "On campus at" says only that we have people there,
 * which the ambassador list backs. Carter asked for "universities we've worked
 * with", but no school has worked with us as an institution, and as of 3 November
 * 2026 there is one real booking, so "worked with", "trusted by", "partners" and
 * "students from" all claim more than we can show. Change the label when bookings
 * can back it, and never show a school's logo, seal, mascot or colors.
 *
 * Left off for now, for Carter to decide: Liberty and Southern Adventist, whose
 * conduct rules make a name beside a spring break trip more likely to draw a
 * complaint; and Test School, which is a test row.
 * ------------------------------------------------------------------------- */
export const CAMPUSES_LABEL = "On campus at";

export const CAMPUSES: string[] = [
  // The SEC.
  "UGA",
  "Auburn",
  "Ole Miss",
  "Tennessee",
  "UT Austin",
  "Oklahoma",
  "Kentucky",
  "Texas A&M",
  "South Carolina",
  "Arkansas",
  // Everyone else.
  "Cornell",
  "Michigan",
  "UNC",
  "Ohio State",
  "SMU",
  "Clemson",
  "Boston University",
  "Penn State",
  "TCU",
  "Florida State",
  "Miami",
  "Virginia Tech",
  "University of Washington",
  "Illinois",
  "University of San Diego",
];

/** Every other school with an ambassador, A to Z. On /campuses, not in the strip. */
export const MORE_CAMPUSES: string[] = [
  "Boise State",
  "Cal State San Marcos",
  "Cincinnati",
  "Colorado Mesa",
  "Fairfield",
  "FIU",
  "Mount Royal",
  "New Mexico",
  "New Mexico State",
  "North Florida",
  "Ohio University",
  "Roger Williams",
  "Rutgers",
  "South Dakota State",
  "Texas Tech",
  "UC Irvine",
  "Wake Tech",
  "Wyoming",
];

export const CAMPUSES_PAGE = {
  line: "Every school with an Outrider ambassador right now.",
  closeTitle: "Don't see your school?",
  closeLine: "Be our first ambassador there.",
  closeCta: "Become an ambassador",
};

/* -- partners ---------------------------------------------------------------------
 * /partners, for brands (Carter, 3 November 2026: "so that we can do brand deals
 * and sponsorships"). NEEDS REAL COPY: the four placements are a first draft of
 * what we would sell, for Carter to confirm before anyone is quoted them. Sap's
 * is the only real example (TRIP_SPONSORS). No traveler or reach numbers: a brand
 * will ask, and the page should only state ones the bookings can back.
 * ------------------------------------------------------------------------- */
export const PARTNERS = {
  label: "For brands",
  headline: "Come on the trip",
  lede: "The Outrider Ski Club and the Outrider Beach Club are small, hosted trips for college students. A brand that comes with us is part of the week.",
  clubsTitle: "Two clubs, one year",
  placementsTitle: "Where you show up",
  placements: [
    { title: "In the welcome gift", body: "In every traveler's hands when they get there." },
    { title: "On the trip", body: "Your product with the group, at the hotel and at our events." },
    { title: "On the page", body: "Named on the trip page people book from." },
    { title: "In what we post", body: "In the photos and video we share from the week." },
  ],
  exampleTitle: "Already with us",
  ctaTitle: "Tell us what you have in mind",
  cta: "Get in touch",
};

/* -- spring break ----------------------------------------------------------------
 * /spring-break. It opened on 1 October 2026 as a door to the list; from 3
 * November 2026 it is the trip: Punta Cana, at Zemi Miches, March 8 to 12 or
 * March 15 to 19, 2027, $100 to hold a spot, from $1,200 a person with airport
 * transfers (Carter's brief).
 *
 * The trip's terms are Carter's: that brief, and the note he sends trip leads
 * (Outrider Instagram/Spring break/Messages.txt, with the "2 Punta Cana" graphic). Say
 * Punta Cana as the headline and Zemi Miches as the hotel, and keep "an hour and a half
 * up the coast" close by, so nobody books expecting to be in the Punta Cana hotel strip.
 * The prices and dates on the page come from the published trips, never from here.
 *
 * What the resort has comes from its own fact sheet and media kit (the "Zemi Miches
 * Digital Assets" library David Schwartz sent on 3 November 2026; general fact sheet
 * dated 18 June 2026). Careful: the group's rooms are Tropical View, and that sheet
 * reserves part of the resort for other guests. Name only what these rooms reach:
 *   Club Azure only: Carey, Caicu, The Royal Palm and its poolside bar, the rooftop pool.
 *   Bungalows only: Jagua. The Hidden Locker is marked "included for bungalow guests", so
 *     the speakeasy stays off the page until Zemi says what it means for these rooms.
 *   Extra fee: mini bowling, laser tag, the escape room and the arcade, so they are
 *     add-ons, whatever "all-inclusive" suggests.
 * That leaves five restaurants (Toa, Boba, Yuca, Guacete, Manicato) plus the food truck,
 * and six bars and lounges (Dujo, Anani, Batey, Serra, Surship, the Cigar Lounge). Never
 * use the resort's totals of seven and eleven, which count all of the above.
 *
 * The fact sheet also lists "unlimited drinks and cocktails", and INCLUDED leaves that
 * line out on purpose. Our insurance broker told us to stay away from any direct
 * connection to serving alcohol, and Carter's lawyer has the question (November 2026).
 *
 * What it sells (Carter, 3 November 2026, after the first version looked "too
 * hotely/polished"): "no one cares about a food truck... They care about catamarans
 * in the bay, bars, cigar lounge, clubs", and that it is "a nice, secluded place".
 * So the seclusion and the evenings lead, and the resort's own features stay small.
 * Name only venues the resort publishes. There may not be a nightclub at all
 * (Carter, 3 November 2026), so the page names none.
 *
 * The angle, later the same day: "upscale fun", "not super party but also not
 * boring", "pitch it like it's a high end nice place". Then on 5 November 2026, after
 * a version with the resort's lifestyle photographs: "too stock-photo-y, feature
 * adults, and don't fit the college vibe", and "I don't need to know there's 800 m of
 * beach". So the page is the Outrider Beach Club now, built like his Punta Cana graphic:
 * film and big capitals, an orange panel, the schools rolling, and hardly any copy. No
 * posed people, no fact-sheet numbers. What the reader still has to know before paying
 * (add-ons cost extra, the airport is 90 minutes away, flights are theirs) stays on the
 * page, short, and the rest folds away under Good to know.
 *
 * A signup from this page's form still carries placement "spring-break", which
 * sends the spring break welcome (lib/email/send.ts).
 * ------------------------------------------------------------------------- */
export const SPRING_BREAK_PLACEMENT = "spring-break";

export const SPRING_BREAK = {
  // The Beach Club is Carter's name for it (3 November 2026), on the trip's
  // masthead and everywhere else it wears a name. "Club" here means belonging to
  // something: there is no membership and nothing to join beyond booking.
  label: "Spring break 2027",
  headline: "Punta Cana",
  // Carter, 5 November 2026: "Definitely need people to know that it's all-inclusive." So
  // it opens the orange panel and sits beside every price. Not on the masthead, where he
  // tried it and took it out the same day. This line is for the share card, which has no
  // panel to say it for it.
  strapline: "All-inclusive spring break",
  // "Your best friends" is how he says to talk to a student (1 October 2026), and
  // "luxury" is one of the positioning words he allowed the same day.
  tagline: "Four nights with your best friends at a brand new luxury resort.",
  // Under the tagline on the page's first screen: the line that stops anyone
  // expecting the Punta Cana hotel strip.
  coast: "An hour and a half up the coast. Quiet beach, no crowds.",
  property: {
    name: "Zemi Miches",
    brand: "Curio Collection by Hilton",
    where: "Miches, Dominican Republic",
    line: "Brand new and secluded, an hour and a half up the coast in Miches. Quiet beach, no crowds.",
  },
  includedHeadline: "All-inclusive",
  // A list and not a set of tiles: each is only as long as it has to be. "Welcome happy
  // hour" is Carter's wording (3 November 2026), and Zemi's proposal comps one cocktail
  // hour for at most 30 people, so a week sold past 30 needs the rest priced. The
  // Outrider moments are unannounced: fill them in when they are set.
  whatYouGet: [
    "Four nights on the beach",
    // What the word means to someone paying for it. Dinner at five restaurants and 24-hour
    // room service are on the fact sheet. Drinks are not said: see the note on INCLUDED above.
    "Dinner every night, room service around the clock",
    "Two to a room, two queen beds",
    "Airport transfers, both ways",
    "A welcome happy hour",
    "A welcome gift",
    "Outrider moments along the way",
    "Our team, the whole trip",
  ],
  /*
   * What "all-inclusive" covers, in the resort's words made shorter. See the note at
   * the top of this block for what is left out and why.
   */
  includedTitle: "All-inclusive, in full",
  included: [
    "Dinner at five restaurants",
    "24-hour room service",
    "A minibar refilled every day",
    "Pool and beach service",
    "Live entertainment every night",
    "Daily activities and workshops",
    "Kayaks and paddleboards",
    "Padel and pickleball",
    "The fitness center and Wi-Fi",
  ],
  /*
   * Every photograph and clip is the resort's own, from its library, used as supplied
   * and only resized. Hildebranda Richards OKed the library for the website and social
   * media on 4 November 2026 (public/images/spring/CREDITS.md). Its brand guide asks for
   * images that are "colorful, bright, and luminous", which is also the high-end pitch,
   * so the muted grade these used to get is gone. Left out on purpose: Club Azure, the
   * Royal Palm rooftop and the bungalows, which these rooms do not reach, and weddings,
   * families and the Taino show. Never caption these people as Outrider guests.
   */
  /*
   * The film bands, each one cut from the resort's films with no posed faces in it:
   * the coast, then fire and smoke and sunset, then the water. public/video has the
   * clips and CREDITS.md says which seconds of which film. One headline each.
   */
  crowd: {
    title: "Where the crowd isn't",
    alt: "The coast from the air: miles of green running down to a long empty shoreline, clear turquoise shallows, then the bay at dusk.",
  },
  nights: {
    title: "Long dinners, late nights",
    line: "All-inclusive, so nobody splits the check at dinner.",
    alt: "A bartender's torch and a smoking cocktail, a pan over blue flame, a plate being dressed at the table, then palms against the last of the sunset.",
  },
  days: {
    title: "On the water by noon",
    alt: "Two people running down the beach, a swimmer seen from above, someone floating in sunlit water, and the pool from the air.",
  },
  out: {
    title: "Whales, waterfalls and Los Haitises",
    // Both weeks are inside the season, which the resort's media kit gives as January
    // to March. Everything in this film is an extra, and the words have to say so.
    line: "Whale watching runs through March. These are add-ons, and we can help you book them.",
    alt: "Humpback whales from above, then the green islands of Los Haitises, a swing over the valley at Montaña Redonda, and two people cycling a wire over the hills.",
  },
  bay: {
    title: "Catamarans on the bay",
    line: "A private boat for your group. It's an add-on, and we can help you book it.",
    image: {
      src: "/images/spring/zemi-sailing.jpg",
      alt: "A small catamaran with three people aboard on calm water, big clouds building over the bay.",
      position: "60% 72%",
      mobilePosition: "62% 70%",
    },
  },
  // The names, and nothing about them that a reader has to stop and read. Rooms and bars
  // with nobody in them: people's own photographs replace these when there are any.
  // Each `-card` file is its card's own 4:5 crop, made from the resort's original
  // (CREDITS.md). A 3:2 photograph cropped by CSS throws away half its width after the
  // browser has picked a size from the card's width, which is why these looked soft.
  venues: [
    { name: "Toa", kind: "Taíno kitchen", src: "/images/spring/zemi-toa-card.jpg", alt: "Toa's dining room: dark red walls, warm low lamps and a long table set for dinner." },
    { name: "The sunken lounges", kind: "Built into the pool", src: "/images/spring/zemi-lounge-night-card.jpg", alt: "A sunken pool lounge glowing at night, the water still and the palms dark behind it." },
    { name: "Manicato", kind: "Amalfi Coast", src: "/images/spring/zemi-manicato-card.jpg", alt: "Set tables under big woven lanterns at Manicato, a wall of warm round lights behind them." },
    { name: "Dujo", kind: "Lobby bar", src: "/images/spring/zemi-dujo-card.jpg", alt: "The Dujo lobby bar: a long curved orange sofa, bar stools and big windows onto the palms." },
    { name: "Yuca", kind: "Beach grill", src: "/images/spring/zemi-yuca-card.jpg", alt: "Yuca's open terrace: tables on blue stone under a pergola, with palms and the beach just past them." },
    { name: "The Cigar Lounge", kind: "Adults only", src: "/images/spring/zemi-cigar-lounge-card.jpg", alt: "The cigar lounge: leather banquettes and mustard armchairs in front of a lit wall of humidors and a bar with red stools." },
    { name: "Boba", kind: "Thai street food", src: "/images/spring/zemi-boba-card.jpg", alt: "Orange chairs and dark tables at Boba, hanging lights over the room and a tall wall of bottles behind." },
    { name: "Serra", kind: "Gastropub, pool tables", src: "/images/spring/zemi-gastropub-card.jpg", alt: "Serra's room: rows of wood tables under big timber beams, a teal wall and screens along the back." },
    { name: "Surship", kind: "Poolside bar", src: "/images/spring/zemi-surship-card.jpg", alt: "The Surship poolside bar: a green tiled counter under a curved white roof, with a woven daybed beside it." },
  ],
  // /destinations' gallery. /spring-break tells the same story in its own sections.
  gallery: [
    {
      src: "/images/spring/zemi-beach-aerial.jpg",
      alt: "A paddleboarder on still water under tall palms leaning out from the shore.",
    },
    {
      src: "/images/spring/zemi-toa.jpg",
      alt: "Toa's dining room: dark red walls, warm low lamps and a long table set for dinner.",
    },
    {
      src: "/images/spring/zemi-paddle.jpg",
      alt: "Two paddleboarders on clear turquoise water, a palm frond overhead and green mountains across the bay.",
    },
    {
      src: "/images/spring/zemi-cigar-lounge.jpg",
      alt: "The cigar lounge: leather banquettes and mustard armchairs in front of a lit wall of humidors and a bar with red stools.",
    },
    {
      src: "/images/spring/zemi-gastropub.jpg",
      alt: "Serra's room: rows of wood tables under big timber beams, a teal wall and screens along the back.",
    },
    {
      src: "/images/spring/zemi-dusk.jpg",
      alt: "Zemi Miches from above at dusk: the lit pools and a big shade tree, the beach and palms, and a quiet bay with mountains behind.",
    },
  ],
  gettingThere:
    "Everyone books their own flights, into Punta Cana (PUJ). It’s an hour and a half from there to Zemi Miches, and your transfer is included, both ways.",
  addOnsTitle: "Add-ons, if you want them",
  addOns: [
    "ATV tours into the mountains",
    "Private catamaran days",
    "Whale watching and day trips",
    "The spa",
    "Mini bowling, laser tag and the arcade",
  ],
  // Carter, 5 November 2026: "we book them for them. Don't say 'book them yourself.'" They
  // still cost extra, and the words have to say so, whatever "all-inclusive" suggests.
  addOnsNote: "These cost extra, and we can help you book them.",
  notIncluded: "Flights aren’t included. Everyone books their own, into Punta Cana (PUJ).",
  // A US citizen needs one for the Dominican Republic. Said only this plainly:
  // entry rules beyond that are not ours to state.
  passport: "You’ll need a valid passport.",
  // In writing from Hildebranda Richards, 4 November 2026. The Terms set 18 to book.
  age: "You have to be 18 to book, and 18-year-olds check in on their own.",
  // Beside Reserve in the orange panel (Carter, 10 November 2026), where people
  // decide; the boxes themselves sit open at checkout on spring break.
  codesLine: "Have a discount or ambassador code? Enter it at checkout.",
  // A week at its cap (the package's capacity in /admin/trips): its tile and its
  // row say this and lead to the list form, in place of Reserve.
  weekFull: "Week full \u2014 join the waitlist",
  waitlistHeading: "Join the waitlist",
  waitlistBody: "We\u2019ll be in touch if a spot opens up.",
  formHeading: "Hear it first",
  formBody: "New dates and new trips go to this list before they reach the site.",
  // formBody's stand-in while no week is on sale, when the dates are already on
  // the page and booking is the news.
  formBodyBeforeBooking: "We’ll email you the moment booking opens.",
  doneHeading: "You’re on the list",
  doneBody: "We’ll write as soon as there’s news. A welcome note is on its way to your inbox.",
  shareText: "Spring break in Punta Cana with Outrider. Four nights at Zemi Miches, $100 holds your spot.",
};

/* -- /ambassador -------------------------------------------------------------
 * The Campus Lead and Ambassador application (19 October 2026). Carter's
 * brief, word for word: traffic arrives from a pop-up in the Chptr app whose
 * headline is "TRAVEL FOR FREE", so the page opens on the same line.
 *
 * Carter took "at Chptr schools" off the subhead on 21 October 2026, and
 * "Chptr" off the form's chapter question: it asks for the chapter the
 * applicant is part of, whoever their chapter is with.
 *
 * Made concrete on 27 October 2026 (Carter: people come from Instagram and
 * should "know exactly what they have to do and what they get"). The page
 * states the rule: hit your goal with friends who book through your link and
 * pay in full, and your trip is free. The numbers are passed in by the page from
 * lib/ambassador-program.ts, the same values /admin/ambassadors counts with, so
 * the promise and the count can never disagree. This file stays client-safe
 * (app/team imports it), which is why they arrive as arguments. The rest of
 * the terms (the held spot, what happens short of the goal) are still for
 * once someone is selected.
 *
 * Two programs from 3 November 2026 (Telluride's 5, spring break's 10), so a
 * single number no longer states the offer. The page reads the programs still
 * selling (openPrograms) and hands them in as `offers`, so after Telluride
 * closes it says spring break alone. No dates here:
 * spring break's closes are placeholders, and "before their week closes" stays
 * true on every program. A free trip takes hitting a goal, and rewards are for
 * friends who book, never "every friend" (Carter, 26 October 2026).
 * ------------------------------------------------------------------------- */
/** A program still selling, as /ambassador states it: "spring break", 10. */
export type AmbassadorOffer = { name: string; goal: number };

/** "5 friends for Telluride. 10 friends for spring break." Empty once nothing is selling. */
function ambassadorGoals(offers: readonly AmbassadorOffer[]): string {
  return offers.map((o) => `${o.goal} friends for ${o.name}.`).join(" ");
}

export const AMBASSADOR = {
  headline: "Travel for free",
  // The offer in one line, right under the headline, with the numbers under it.
  perk: "Hit your goal. Your trip is free.",
  goals: ambassadorGoals,
  subhead: "Outrider is selecting a small team of Campus Leads and Ambassadors.",
  apply: "Apply",
  // What to do, in order: a real sequence, so it is numbered.
  stepsTitle: "How it works",
  steps: (offers: readonly AmbassadorOffer[]) => [
    { title: "Apply", line: "It takes two minutes, right here." },
    { title: "Get your link", line: "If you’re selected, you get your own link to share." },
    {
      title: "Hit your goal",
      line:
        offers.length > 0
          ? `${ambassadorGoals(offers)} They book through your link and pay in full before their week closes, and that trip is free.`
          : "Friends book through your link and pay in full before their week closes. Hit your goal and your trip is free.",
    },
  ],
  getTitle: "What you get",
  // Labels are set as capitals headings (26 Oct 2026 polish), so they carry
  // no full stop; the lines under them are sentences and keep theirs. "Rewards
  // for friends who book" went on 27 October 2026: the program as built pays
  // in the free trip, so the list says exactly that.
  get: [
    { label: "A free trip", line: "Hit your goal and your trip is on us." },
    { label: "Your own link", line: "Friends who book through it count toward your goal." },
    { label: "First access", line: "Every trip opens to you before anyone else." },
    { label: "A direct line to the founders", line: "Your input shapes where we go next." },
  ],
  getNote: "Full details are shared once you’re selected.",
  whoTitle: "Who we’re looking for",
  who: "People whose friends already follow their lead. You know who decides where your group goes. If that’s you, apply.",
  formTitle: "Apply",
  formNote: "Limited spots per campus.",
  submit: "Submit",
  receivedTitle: "Application received.",
  receivedBody: "We’ll be in touch.",
  signInLead: "Already an ambassador?",
  signIn: "Sign in",
};

/* -- the ambassador portal (/ambassador/dashboard) ---------------------------
 * Short declaratives, specifics over adjectives, no exclamation marks (Carter's
 * portal brief, 29 October 2026). The program's numbers and dates come from
 * lib/ambassador-program.ts, so they are passed in rather than written here.
 *
 * NEEDS REAL COPY: the scripts are drafted from /telluride's own facts (the
 * dates, The Peaks, ski-in ski-out, "$100 holds your spot") and spring break's
 * (Zemi Miches, 3 November 2026). Swap in the messages from the ambassador doc
 * if Carter prefers those. {link} and {code} are filled in per ambassador, with
 * the link for the program on screen. Scripts are short, how a person texts: no
 * question followed by a scripted next step.
 * ------------------------------------------------------------------------- */
export const AMBASSADOR_PORTAL = {
  notAmbassadorTitle: "This portal is for Outrider ambassadors",
  notAmbassadorBody:
    "It opens for the email you applied with, once you’re selected. If you applied with a different email, log out and sign in with that one.",
  notAmbassadorApply: "Apply to be an ambassador",
  agreementLead: "Read this once. It’s the whole deal, in plain words.",
  agreementCheck: "I agree to these terms.",
  agreementSubmit: "Agree and open my dashboard",
  // The playbook PDF, at the top of Home (Carter, 30 October 2026). The file
  // is public/outrider-ambassador-playbook.pdf, so anyone with the link can
  // open it; the line is the playbook's own.
  playbookTitle: "Playbook",
  playbookLine: "Everything you need, in one PDF. Read it once, then keep it open while you text.",
  playbookView: "View playbook",
  playbookDownload: "Download PDF",
  playbookPath: "/outrider-ambassador-playbook.pdf",
  playbookFileName: "outrider-ambassador-playbook.pdf",
  // "Post today", at the top of Home until their first friend books (Carter,
  // 29 October 2026). Same ask as the welcome email's "First thing today".
  postTodayTitle: "Post today",
  postTodayLine: (code: string, hasGraphics: boolean) =>
    `Share an @outridertravel post${hasGraphics ? " or a graphic from your Toolkit" : ""}. Add your code, ${code}, and tag @outridertravel.`,
  postTodayGraphic: "Get a graphic",
  postTodayInstagram: "Open Instagram",
  instagramUrl: "https://www.instagram.com/outridertravel/",
  shareTitle: "Share your link",
  codeTitle: "Your code",
  codeNote: "Friends type it in Referred by at checkout. It takes nothing off.",
  qrNote: "For in person. Screenshot it or hold up your phone.",
  perksTitle: "Your perks",
  friendsTitle: "Your friends",
  friendsEmpty: "No one has booked with your code yet. Send your link to the group chat that decides where you go.",
  leaderboardTitle: "Rankings",
  leaderboardEmpty: "No friends booked yet. The first one puts you on the board.",
  leaderboardShow: "Show my name on the leaderboard",
  leaderboardShownNote: "Everyone sees your first name, last initial and school.",
  leaderboardHiddenNote: "Hidden. Others see you as “An ambassador”. You still have a rank.",
  toolkitTitle: "Toolkit",
  toolkitLine: "Graphics to post, messages to send, and answers for your friends.",
  graphicsTitle: "Story graphics",
  graphicsNote: "Put your link sticker in the open space at the bottom, so friends who tap it are credited to you.",
  graphicsEmpty: "Graphics for your school are on the way.",
  scriptsTitle: "Scripts",
  faqTitle: "Questions",
  help: "Anything else, message us in the GroupMe.",
  // By program id (lib/ambassador-program.ts).
  scripts: {
    "telluride-2026": [
      {
        title: "Text a friend",
        body: "Come to Telluride with me. Outrider has us ski-in, ski-out at The Peaks, December 14 to 18 or January 4 to 8. They book the hotel, the lifts, the rides and the nights out. $100 holds your spot: {link}",
      },
      {
        title: "Group chat",
        body: "Telluride this winter, four nights at The Peaks, ski-in, ski-out. December 14 to 18 or January 4 to 8. December books until November 14, January until December 4. Book through my link so we’re on the same trip: {link}",
      },
      {
        title: "Story caption",
        body: "Telluride with Outrider. Link’s in my bio, or put {code} in Referred by at checkout.",
      },
    ],
    "spring-break-2027": [
      {
        title: "Text a friend",
        body: "Come to Punta Cana with me for spring break. Outrider has us at Zemi Miches, all-inclusive, right on the beach. March 8 to 12 or March 15 to 19. $100 holds your spot: {link}",
      },
      {
        title: "Group chat",
        body: "Spring break in Punta Cana. Four nights at Zemi Miches, all-inclusive, on the beach, two to a room. March 8 to 12 or March 15 to 19. From $1,200 with airport transfers both ways, flights not included. $100 holds your spot. Book through my link so we’re on the same trip: {link}",
      },
      {
        title: "Story caption",
        body: "Spring break in Punta Cana with Outrider. Link’s in my bio, or put {code} in Referred by at checkout.",
      },
    ],
  } as Readonly<Record<string, readonly { title: string; body: string }[]>>,
  /**
   * `countBy` reads like "the end of November 14 for December, December 4 for
   * January". `heldSpots` says the program has the Telluride deal for falling
   * short: a held spot and a credit per friend. Without it the question isn't
   * asked, since nothing has been decided that could answer it.
   */
  faq: (countBy: string, goal: number, heldSpots: boolean) => [
    {
      q: "Can I keep this on my home screen?",
      a: "Yes, and it opens like an app. On iPhone, tap Share, then Add to Home Screen. On Android, open the menu, then Add to Home screen.",
    },
    {
      q: "Does my friend get a discount?",
      a: "No. Your code takes nothing off. It tells us your friend came from you.",
    },
    {
      q: "When does a friend count?",
      a: `When they’ve booked with your code or link and their trip is paid in full by ${countBy}. A friend on a deposit shows as on the way.`,
    },
    {
      q: "Do I need another code for another trip?",
      a: "No. One code, every trip. A friend counts toward the trip they book, never two.",
    },
    {
      q: "What if they forget my code?",
      a: "Your link remembers you for 30 days on the device they opened it on. If a friend booked without it, message us in the GroupMe and we’ll add it.",
    },
    {
      q: "Two ambassadors sent the same friend. Who gets it?",
      a: "The code typed at checkout. With no code typed, the most recent link they opened.",
    },
    ...(heldSpots
      ? [
          {
            q: `What if I’m short of ${goal}?`,
            a: "Every friend who pays in full still takes $100 off your own spot. Your spot is held with no deposit; when the count closes, you pay what’s left or release it.",
          },
        ]
      : []),
  ],
};

/* -- what makes Outrider different ------------------------------------------
 * Describes how the company operates, not one destination. Every claim is
 * backed by the tier inclusions in the database.
 *
 * Rewritten 3 November 2026 so each line holds on every trip. Lift tickets,
 * penthouses and the no-resort-fee promise are Telluride facts, so they are named
 * as Telluride's or left to /telluride. "We've stayed at the property" went: the
 * repo says nothing of a stay at Zemi Miches, and this claims it of every trip.
 * ------------------------------------------------------------------------- */
export const VALUE_PROPS = [
  {
    eyebrow: "Small groups",
    title: "Familiar faces by day two",
    // "Open to every school" is the other half of small (Carter's mission,
    // 1 October 2026): exclusive by size, never by who you are.
    body:
      "Every trip is sized before it goes on sale and stays that size, small enough that faces are familiar by day two. It's open to students from any school, so you come with your friends and leave knowing people from other campuses.",
  },
  {
    eyebrow: "Hosted",
    title: "Your room's ready when you land",
    body:
      "We scout the hotels long before a trip goes on sale, and we only work with places that hold a real standard. When you arrive, your room is ready and your plans are made. Our team knows your name and stays with you the whole trip, so there's always someone to ask.",
  },
  {
    eyebrow: "All in",
    title: "One price, all in",
    body:
      "Your room, your rides from the airport, a welcome gift and our team are in every price. Telluride adds lift tickets, rentals and the private events, and Zemi Miches is all-inclusive. Everyone books and pays for their own spot, all at once or $100 now and the rest later, so nobody fronts the money for friends or spends the semester chasing Venmo requests.",
  },
  {
    eyebrow: "We go first",
    title: "We go first",
    body:
      "Before a trip goes on sale, we've picked the hotel, held the rooms and lined up the rides. Then we come along for the whole thing.",
  },
];

/* -- the About page's five reasons -------------------------------------------
 * The main thing the About page has to do (Carter, 1 October 2026): show
 * plainly why Outrider beats the usual college trip. Five claims, each one a
 * headline in Extrabold capitals and two sentences under it, with a
 * photograph. Every line restates something the site already promises
 * (VALUE_PROPS, SHARED_INCLUSIONS, the ComparisonTable rows), so this adds no
 * new claim; change them together. Zemi Miches shows twice on /about, here and
 * in the masthead, with zemi-aerial.jpg both times. Swap one for another from the
 * press kit (SPRING_BREAK). Every other photograph appears once.
 *
 * Rewritten 3 November 2026 so each reason is true of Telluride and spring
 * break alike, naming the trip wherever a detail belongs to one of them.
 * Optional add-ons at Zemi Miches are why it reads "have to book". "We stayed at
 * the hotel" went for the reason given at VALUE_PROPS.
 * ------------------------------------------------------------------------- */
export const ABOUT_DIFFERENCES: { title: string; body: string; image: { src: string; alt: string } }[] = [
  {
    title: "One price, everything in it",
    body: "Your room, your rides from the airport and our team, plus lift tickets and rentals in Telluride and the all-inclusive plan at Zemi Miches. Flights are the only thing you have to book.",
    image: {
      src: "/images/people/friends-snow-throw.jpg",
      alt: "Four friends on skis, arms linked, laughing as someone throws a handful of powder at them in falling snow.",
    },
  },
  {
    title: "The whole group under one roof",
    body: "Everyone stays at one hotel: The Peaks in Telluride, ski-in, ski-out, or Zemi Miches up the coast from Punta Cana, all-inclusive on the beach. Walk out the door and you're on the snow or the sand.",
    image: {
      src: "/images/spring/zemi-aerial.jpg",
      alt: "Zemi Miches from above: the pools and palm trees running down to a sandy beach, with a calm bay and green mountains behind.",
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
    title: "Ready before you land",
    body: "We hold the rooms and line up the rides before a single spot goes on sale. Nothing on these trips is a guess.",
    image: {
      src: "/images/telluride/gondola-night.jpg",
      alt: "A gondola cabin crossing a snowy ridge, the town far below in the valley.",
    },
  },
  {
    title: "Our team, all week",
    body: "We're on site with you the whole trip. Everyone pays their own way, so nobody fronts the money, and the friend who planned it finally gets a week off.",
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
   * version first, and the side-by-side comparison carries the contrast.
   * "One town" became "one place" on 3 November 2026: Zemi Miches is a secluded
   * resort, not a town. */
  body: [
    "A trip with your friends should be the best week of your year. A place you've wanted to see for ages, somewhere to stay you'd happily tell your parents about, and everyone you like in one place at the same time.",
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

/**
 * The one thing deliberately left out, said next to the list above. Telluride's
 * alone: /telluride and the WhatYouGet block, which only a Telluride departure
 * renders, are its only readers, so it can keep naming Montrose.
 */
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
  // One sentence for every line since 3 November 2026, when a Punta Cana booker
  // started reading it: it used to say "getting hurt on the mountain". It names
  // what plans are for and leaves what this one covers to Faye's page.
  body: "Travel insurance isn't in any package. A trip away has more that can go sideways than a week at home, so we point people at Faye: quotes take about a minute, and plans are written for the usual suspects, canceled flights, delayed bags, getting hurt while you're away. What a plan actually covers is on their page. Read it before you buy.",
  cta: "Get a quote from Faye",
  /** One line, plain, wherever the link appears. Do not soften or drop it. */
  disclosure: "Faye is a partner of ours. We earn a commission if you buy through this link, and it costs you nothing extra.",
} as const;
