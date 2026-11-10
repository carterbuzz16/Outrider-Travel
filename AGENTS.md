# AGENTS.md

Outrider — a luxury small-group adventure travel company (ski and spring break;
formals held back until later). The site presents one brand with several kinds
of trip, never a ski company with extras. Next.js 14 App Router, TypeScript, Tailwind,
Supabase (Postgres + Auth), Prisma, Stripe, Resend. Deployed on Vercel.

## Dev environment

```bash
npm install          # postinstall runs `prisma generate`
npm run dev          # http://localhost:3000
npm run build        # always run before claiming a change works
npm run lint
npx tsc --noEmit     # there is no `typecheck` script; call tsc directly
```

- Never start a dev server with a bare `next dev` in a detached shell if the
  harness offers a preview tool — use the preview tool so the port is managed.
- `.env.local` holds real credentials. Never print, commit, or echo its values;
  `grep -oE '^[A-Z_]+' .env.local` is enough to check which keys are set.
- `.env.local.example` lists every variable the app reads.

## Layout

```
app/(site)/          public marketing pages — home, trips, about, contact, legal
app/(protected)/     booking flow (requires auth)
app/admin/           trip + payment admin (role-gated)
app/coming-soon/     the original coming-soon panel, kept after "/" became Home
app/style/           design-system styleguide — dev only, 404 in production
components/ui/       the design system; import from "@/components/ui"
lib/trips.ts         public trip reads (published only)
lib/trip-lines.ts    what differs by kind of trip: page, airport, hotel, rentals
lib/site-content.ts  marketing copy that is not in the database
prisma/schema.prisma database schema (Supabase is the source of truth at runtime)
```

## Design system

The brand is the final identity from Devote ("Outrider Final Identity & Stock
Options", 14 Sep 2026). Read `app/globals.css` before writing any UI. Tokens
are layered brand → semantic → scheme, and components consume the semantic
layer only.

- Put `scheme-light` / `scheme-stone` / `scheme-espresso` / `scheme-club`
  plus `scheme-paint` on a section; everything inside recolours itself. There
  are no `dark:` variants. Pages are built on paper and espresso; club blue is
  a single panel, never alternated.
- Use `shell` for page width, `t-display` (Extrabold capitals, the book's
  HEADLINE) / `t-title` / `t-heading` (Medium, the book's Subhead) /
  `t-label` / `t-body` / `t-lede` for type, and `t-rule-label` (small
  capitals) to open a section.
- **No hairlines on the public site** (Carter, 1 Oct 2026: the lines between
  words and sections "make it feel super AI"). `.site-quiet`, set in the
  (site) layout, makes `--rule`/`--rule-strong`/`--rule-faint` transparent;
  form controls and outlined buttons draw their edge from `--control-rule`.
  Don't add decorative rules back; use space, color panels and type size.
- **Presence over politeness.** He wants the site to feel elevated and
  exclusive, like Palm Tree Crew's: full-bleed video (`HeroVideo` with a
  `mobileSrc`, `VideoBand` for mid-page loops made from his own photos),
  headlines in Extrabold capitals set straight on the picture, big numbers.
- **The whole site uses the Ski Club look for now.** Palette is warm gray,
  espresso, black and Ski Club blue (#89B2C4). Do not use the book's sage
  green: the team rejected it. Club blue is 2.2:1 on paper, so on light
  grounds the readable accent is `--accent` (club ink); on espresso, club blue
  is the accent and the filled button.
- **Spring break has one panel color of its own**, `scheme-spring` (#CB7A3F, from
  Carter's Punta Cana graphic, deep espresso text at 4.7:1). Short copy only, and it
  stays on spring break surfaces. /spring-break opens and closes on it, built like his
  graphic, and between the two it is film on espresso: never alternate it.
- **/spring-break is the Outrider Beach Club, not a hotel page** (Carter, 5 Nov 2026).
  Film, big capitals, and hardly any copy. No posed people from the resort's library
  ("stock-photo-y", "feature adults"), and no fact-sheet numbers. The one thing it must
  shout is **all-inclusive**: the orange panel's headline and beside every price, but not
  on the masthead, where Carter tried it and took it out. Drinks stay unsaid until his
  lawyer answers (note above `SPRING_BREAK`).
- Typeface is Figtree, permanently. The book specifies Centra No.2, but the
  team will not license it; do not add it. The OG images use static Figtree
  instances in `app/fonts`.
- Logo artwork lives in `components/ui/logo-art.ts`, copied verbatim from the
  SVG masters. Never redraw or restyle the letterforms. The nav and page headers
  stay plain (`variant="inline"`).
- **Each trip is a club** (Carter, 3 Nov 2026): the Outrider Ski Club and the
  Outrider Beach Club, named on `lib/trip-lines.ts` as `club` and `clubLogo`. Trip
  surfaces wear their own lock-up (`club`, `beach-club`), and neither appears on
  the other's trip. The footer stays plain Outrider, with no club lock-ups. The Beach Club art is composed from the Ski Club master until
  Devote delivers one; the note in `logo-art.ts` says how. "Club" is belonging, not
  a membership: nothing should imply one, or an affiliation with a resort or school.
- **School names only.** `CampusMarquee` rolls plain names and opens `/campuses`,
  the full list, and both say only what the bookings and ambassador list can back.
  Never a school's logo, seal, mascot or colors. See the note on `CAMPUSES` in
  `lib/site-content.ts`.
- `/style` renders the whole library. It is gated in `middleware.ts`; set
  `ENABLE_STYLEGUIDE=1` to expose it on a deployed environment.

When changing colors, verify contrast rather than eyeballing it — every
text/background pair on a page should clear 4.5:1 (3:1 for large text).

## Data

- **RLS on `trips` and `tiers` grants SELECT to `authenticated` only.** A
  logged-out visitor reading through the anon key gets nothing. Public pages
  therefore read via `lib/trips.ts`, which uses the service-role client and
  hard-codes `status = 'published'`. Do not export a raw client from that
  module, and do not add a status argument to its functions.
- Trips are edited in `/admin/trips`, not in code. A trip only appears on the
  public site when its status is `published`.
- `scripts/seed.ts` inserts rows prefixed `[seed] ` and clears them on re-run.
  Those are test fixtures — do not treat them as real departures.
- **A new departure needs code before it is published.** Publish first and the
  live site gets it wrong. Its start date needs a line in `lib/signup-deadline.ts`
  (unlisted departures are closed), `lib/installments.ts` (these dates are also
  listed in the Terms) and `lib/trip-logistics.ts`. A new place needs an entry in
  `lib/trip-lines.ts`, because an unrecognized destination is treated as ski. Never
  reuse the tier names BASE or MID elsewhere: `lib/room-media.ts` keys The Peaks'
  rooms on them.
- **Spring break is on sale** (Carter, 10 Nov 2026: `SPRING_BREAK_DATES_CONFIRMED` in
  `lib/signup-deadline.ts`). $100 down, the balance on January 8, 2027. Its trip terms
  are Carter's words in `lib/spring-break-terms.ts`, the one place his lawyer edits;
  they are a section of the Terms, so change `TERMS.version` with them. Spring break
  books on the Terms alone (`TripLine.assumptionOfRisk`): the ski waiver stays
  Telluride's until counsel writes one for the beach. Each week's cap is its package
  capacity in `/admin/trips` (20 at opening), and a full week reads "Week full —
  join the waitlist". Anything new on checkout stays spring break only unless Carter
  says Telluride too: he wants Telluride's pricing, codes and flow untouched.

## Conventions

- Match the surrounding code: comments explain *why*, not what, and existing
  files are heavily commented where a decision is non-obvious. Keep that up.
- Server Components by default; add `"use client"` only where state, effects or
  event handlers are actually needed.
- Server actions return `{ ok: false, message }` rather than throwing, so the
  UI can render the failure. Rate-limit any public, unauthenticated action with
  `checkRateLimit` (see `app/waitlist-actions.ts`).
- Marketing copy that depends on facts only the team has lives in
  `lib/site-content.ts`, marked `NEEDS REAL COPY`. Do not invent founder
  biography, testimonials, press, or legal policy text.
- No middots. The middle dot (`·`) is banned everywhere a reader can see
  it — body copy, labels, eyebrows, badges, buttons, page titles, emails,
  OG images. Strung-together facts read as machine output, which is the one
  thing this brand cannot sound like. Use a comma, a full stop, or a line
  break instead. The two exceptions are a `|` in browser-tab title templates
  (`%s | Outrider`) and a `/` as the repeating device on the circular stamps,
  the coming-soon marquee and the campus marquee and list, where a separator glyph is
  doing real typographic work.

## Before you finish

1. `npm run build` and `npx tsc --noEmit` both clean.
2. `npm run lint` clean.
3. If the change is visible, load it in the browser and confirm it — do not ask
   the user to check for you.
4. Do not commit or push unless asked.
