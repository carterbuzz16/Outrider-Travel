# AGENTS.md

Outrider — a luxury small-group adventure travel company (ski trips now; spring
break and formals trips planned). Next.js 14 App Router, TypeScript, Tailwind,
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
lib/site-content.ts  marketing copy that is not in the database
prisma/schema.prisma database schema (Supabase is the source of truth at runtime)
```

## Design system

Read `app/globals.css` before writing any UI. Tokens are layered
brand → semantic → scheme, and components consume the semantic layer only.

- Put `scheme-light` / `scheme-forest` / `scheme-teal` / `scheme-teal-ink` /
  `scheme-charcoal` plus `scheme-paint` on a section; everything inside
  recolours itself. There are no `dark:` variants.
- Use `shell` for page width, `t-display` / `t-title` / `t-heading` /
  `t-label` / `t-body` / `t-lede` for type.
- **Brand teal (#4C8591) and burnt orange are mid-tones.** Both clear 3:1
  against paper, so they are safe as surfaces, rules and marks, and neither is
  legible at text size. Small text uses `--accent` / `--flag-ink`; a filled
  button sits on `--accent-solid`. `.scheme-teal` is display type only.
- `/style` renders the whole library. It is gated in `middleware.ts`; set
  `ENABLE_STYLEGUIDE=1` to expose it on a deployed environment.

When changing colours, verify contrast rather than eyeballing it — every
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

## Before you finish

1. `npm run build` and `npx tsc --noEmit` both clean.
2. `npm run lint` clean.
3. If the change is visible, load it in the browser and confirm it — do not ask
   the user to check for you.
4. Do not commit or push unless asked.
