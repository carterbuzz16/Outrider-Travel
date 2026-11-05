import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BEACH_CLUB } from "@/components/ui/Logo";
import { SPRING_BREAK } from "@/lib/site-content";

/*
 * The card for the link ambassadors and ads hand out (3 November 2026). Built as
 * app/(site)/waitlist/opengraph-image.tsx is: vector artwork, the static Figtree
 * instances in app/fonts, no network calls at build, and the headline in the
 * book's Extrabold capitals, under the Beach Club lock-up (Carter, 3 November
 * 2026), since this card is the club's front door.
 *
 * No price and no dates. The card is built once and pasted into group chats
 * forever, so it says only what will not change when a trip is edited in
 * /admin/trips, and "$100" alone would be a deposit shown without its total.
 *
 * Two fades, as on the page: one behind the logo, one up from the foot behind the
 * words, so the water and the palms between them stay bright.
 */

export const alt = "All-inclusive spring break in Punta Cana with Outrider. Four nights at Zemi Miches, on the beach.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F2EFEA";

export default async function SpringBreakOpengraphImage() {
  const [medium, extrabold, photo] = await Promise.all([
    readFile(path.join(process.cwd(), "app/fonts/Figtree-Medium.ttf")),
    readFile(path.join(process.cwd(), "app/fonts/Figtree-ExtraBold.ttf")),
    readFile(path.join(process.cwd(), "public/images/spring/zemi-dusk.jpg")),
  ]);

  const lockupWidth = 400;
  const lockupHeight = Math.round((lockupWidth * BEACH_CLUB.h) / BEACH_CLUB.w);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#2A2320" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM */}
        <img
          src={`data:image/jpeg;base64,${photo.toString("base64")}`}
          width={1200}
          height={800}
          // Pinned to the foot of the frame: the 170px this crops comes off the sky.
          style={{ position: "absolute", top: -170, left: 0, width: 1200, height: 800 }}
          alt=""
        />
        <div
          style={{
            // Satori ignores `inset`, so the box is spelled out.
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background: "linear-gradient(0deg, rgba(31,26,23,0.9) 0%, rgba(31,26,23,0.66) 42%, rgba(31,26,23,0) 78%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            // Deep enough for "Beach Club", the lock-up's thin half, over the pale bay.
            height: 250,
            display: "flex",
            background: "linear-gradient(180deg, rgba(42,35,32,0.86) 0%, rgba(42,35,32,0.68) 50%, rgba(42,35,32,0) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "56px 76px",
            fontFamily: "Brand",
            color: PAPER,
          }}
        >
          <svg width={lockupWidth} height={lockupHeight} viewBox={`0 0 ${BEACH_CLUB.w} ${BEACH_CLUB.h}`} fill={PAPER}>
            <path d={BEACH_CLUB.mark} />
            <path d={BEACH_CLUB.word} />
            <path d={BEACH_CLUB.club} />
          </svg>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Brand Extrabold",
                fontWeight: 800,
                fontSize: 148,
                letterSpacing: 0,
                lineHeight: 0.95,
              }}
            >
              PUNTA CANA
            </div>
            {/* Set to PUNTA CANA's width, as on the page. */}
            <div
              style={{
                display: "flex",
                marginTop: 12,
                fontFamily: "Brand Extrabold",
                fontWeight: 800,
                fontSize: 65,
                letterSpacing: 0,
                lineHeight: 1,
              }}
            >
              {SPRING_BREAK.strapline.toUpperCase()}
            </div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 32, lineHeight: 1.3, letterSpacing: -0.4 }}>
              {SPRING_BREAK.tagline}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Brand", data: medium, style: "normal", weight: 500 },
        { name: "Brand Extrabold", data: extrabold, style: "normal", weight: 800 },
      ],
    },
  );
}
