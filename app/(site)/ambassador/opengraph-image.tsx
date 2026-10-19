import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MARK } from "@/components/ui/Logo";
import { AMBASSADOR } from "@/lib/site-content";

/*
 * The card for /ambassador, which travels by text message and group chat from
 * the Chptr pop-up. The page's hero photograph with its one line on it, the
 * same construction as the /waitlist card: vector mark, the vendored static
 * instances of Figtree, no network calls at build.
 *
 * Like the page, the photograph takes a single flat wash of deep espresso
 * rather than a gradient, and the headline breaks where the page's does.
 */

export const alt = "Travel for free. Become an Outrider Ambassador.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F2EFEA";
// Club-light, the espresso scheme's accent, for the one short label.
const CLUB_LIGHT = "#A3C4D2";

export default async function AmbassadorOpengraphImage() {
  const [medium, extrabold, photo] = await Promise.all([
    readFile(path.join(process.cwd(), "app/fonts/Figtree-Medium.ttf")),
    readFile(path.join(process.cwd(), "app/fonts/Figtree-ExtraBold.ttf")),
    readFile(path.join(process.cwd(), "public/images/home/golden-ridge.jpg")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#2A2320" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM */}
        <img
          src={`data:image/jpeg;base64,${photo.toString("base64")}`}
          // 3200x1796 at the card's width, centred on the ridge.
          width={1200}
          height={674}
          style={{ position: "absolute", top: -22, left: 0, width: 1200, height: 674, objectFit: "cover" }}
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
            background: "rgba(42,35,32,0.42)",
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
            padding: "56px 72px",
            fontFamily: "Brand",
            color: PAPER,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <svg width="62" height="53" viewBox={`0 0 ${MARK.w} ${MARK.h}`} fill={PAPER}>
              <path d={MARK.d} />
            </svg>
            <div style={{ display: "flex", fontSize: 21, letterSpacing: 3, color: CLUB_LIGHT }}>
              LIMITED SPOTS PER CAMPUS
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontFamily: "Brand Extrabold",
                fontWeight: 800,
                fontSize: 150,
                letterSpacing: 0,
                lineHeight: 0.88,
              }}
            >
              <div style={{ display: "flex" }}>TRAVEL</div>
              <div style={{ display: "flex" }}>FOR FREE</div>
            </div>
            <div style={{ display: "flex", marginTop: 30, fontSize: 30, maxWidth: 780, lineHeight: 1.3, letterSpacing: -0.3 }}>
              {AMBASSADOR.subhead}
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
