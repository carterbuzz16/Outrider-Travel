# Comparison graphic — design brief

Content and specs for the "how it usually goes vs. Outrider" graphic on the
About page. Two versions of the copy below: a short one written for a graphic,
and the long one currently on the site.

---

## Short version (use this for the graphic)

Seven rows, two columns. The left column is headed **How it usually goes** and
deliberately names nobody. The right is **With Outrider**.

| | How it usually goes | With Outrider |
| --- | --- | --- |
| **The price** | Base price, then tickets, rentals, transfers and fees on top | One price. Everything in it. |
| **Where you stay** | Twenty people across four rentals | One property, booked whole |
| **Lift tickets and gear** | Bought at the window on day one | Arranged before you land |
| **Getting there** | Sort your own ride from the airport | Transport both directions, included |
| **Paying for it** | One person fronts it and chases the group chat | Everyone books their own spot, on a payment plan |
| **On the trip** | The organiser becomes the help desk | Outrider staff on the ground |
| **How many people** | As many as will pay | Capped. Six to eight per suite. |

If seven rows is too many for the format, the four that carry the most weight
are **the price**, **where you stay**, **paying for it**, and **on the trip**.

---

## Long version (currently rendered on the site)

**The price**
- Usually: A headline number, then lift tickets, rentals, transfers and resort fees on top. Nobody knows the real total until it is spent.
- Outrider: One price per person with everything in it. What you see on the trip page is what the trip costs.

**Where you stay**
- Usually: Twenty people spread across four rentals on the wrong side of town, sorted by whoever booked first.
- Outrider: One property, booked whole. Everyone is under the same roof, walking distance from the same lift.

**Lift tickets and gear**
- Usually: Bought individually, at the window, on the first morning, in the line.
- Outrider: Three-day tickets and rentals arranged before you land, with a valet fitting slot on the upper tiers.

**Getting there**
- Usually: Everyone books their own ride from the airport and hopes the timing works.
- Outrider: Ground transport both directions is arranged and included, shared or private depending on your package.

**Paying for it**
- Usually: One person fronts the money and spends the next three months chasing a group chat.
- Outrider: Each traveller books their own spot. A deposit holds it, the balance is split into scheduled payments, and nobody owes a friend anything.

**On the trip**
- Usually: Whoever organised it becomes the help desk for four days and never really gets a holiday.
- Outrider: Outrider staff are on the ground for the duration. The person who organised it gets to actually ski.

**How many people**
- Usually: As many as will pay, because volume is the business model.
- Outrider: Capped by design. Suites are booked as buyouts for six or eight, and guiding is one instructor per six.

---

## Brand specs

**Colours**

| Role | Hex |
| --- | --- |
| Paper (background) | `#FAF6EF` |
| White (panel) | `#FFFFFF` |
| Charcoal (primary text) | `#1A1A1A` |
| Ash (secondary text) | `#6B6B6B` |
| Teal, readable (accent, rules, the Outrider column) | `#37646E` |
| Brand teal (fills and rules only, never text) | `#4C8591` |
| Burnt orange (scarcity only, probably unused here) | `#9E501F` |
| Hairline rule | `#1A1A1A` at 16% |

**Type**

- Headings, labels, small caps: **DM Mono**, Medium (500), uppercase, letter-spacing 0.18em for labels and 0.32em for the small stamp-style labels.
- Body copy: **Source Serif 4**, Regular (400), line-height 1.65.
- Both are free on Google Fonts.

**Rules of the house style**

- Square corners. Radii are 2px at most, never pills or rounded cards.
- Hairlines, not fills, to separate things. One accent, used sparingly.
- No drop shadows, no gradients.
- Brand teal `#4C8591` is a mid tone and is **not legible at text size**. Use `#37646E` for any teal text.
- No em dashes in the copy.

---

## Export specs

- **Width:** 1600px minimum (the container is 1184px on desktop, so this is 2x-ish). 2368px if you want true 2x.
- **Aspect:** whatever the content needs. It renders full width and scales.
- **Format:** PNG if it has flat colour and type (it will). JPG only if it ends up photographic.
- **Background:** not transparent. Paint it `#FAF6EF` or `#FFFFFF` so it sits correctly on the page in both light and dark.

**Mobile matters here.** At 375px a 7-row, 3-column graphic becomes unreadable.
Either design it to hold up when scaled to ~335px wide (few words, big type), or
send me a second portrait-format version for small screens and I will swap
between them.

---

## Dropping it in

1. Put the file in `public/images/` (e.g. `public/images/comparison.png`).
2. In `lib/site-content.ts`, set:

```ts
export const COMPARISON_IMAGE = {
  src: "/images/comparison.png",
  alt: "How group ski trips usually go, compared with Outrider: one price with everything in it, one property booked whole, tickets and transport arranged, everyone booking their own spot, staff on the ground, and capped group sizes.",
  width: 1600,
  height: 900, // the real pixel height of your file
};
```

That is the only change needed. The page renders the image instead of the
built block, and the text version stays in the code as the fallback and as the
record of what the claims actually are.

The `alt` text matters: an image of a table is invisible to a screen reader and
to search engines, so it needs to state the comparison in words.
