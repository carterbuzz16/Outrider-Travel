import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MARK } from "@/components/ui/Logo";

/*
 * The card for the link that actually gets handed out.
 *
 * /waitlist is the Instagram bio link and the one pasted into chapter group
 * chats, so its preview is a photograph and an instruction rather than the
 * brand card every other page uses. Same construction as app/opengraph-image:
 * vector artwork, vendored static instances of the brand face, no network
 * calls at build. The headline is set the way the brand book sets HEADLINE:
 * Extrabold capitals.
 */

export const alt = "Join the Outrider list. Telluride, winter 2026 and 2027.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F2EFEA";
// Club-light, the espresso scheme's accent. Kept to the short eyebrow, where it
// sits on the darkest part of the wash; the URL is paper so it survives the
// brighter snow in the bottom right.
const CLUB_LIGHT = "#A3C4D2";

export default async function WaitlistOpengraphImage() {
  const [medium, extrabold, photo] = await Promise.all([
    readFile(path.join(process.cwd(), "app/fonts/Figtree-Medium.ttf")),
    readFile(path.join(process.cwd(), "app/fonts/Figtree-ExtraBold.ttf")),
    readFile(path.join(process.cwd(), "public/images/telluride/alpenglow.jpg")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#2A2320" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM */}
        <img
          src={`data:image/jpeg;base64,${photo.toString("base64")}`}
          width={1200}
          height={659}
          style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 659, objectFit: "cover" }}
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
            // Deep espresso rather than neutral black, so the wash warms the
            // photograph toward the brand instead of just darkening it.
            background: "linear-gradient(90deg, rgba(42,35,32,0.93) 0%, rgba(42,35,32,0.76) 60%, rgba(42,35,32,0.46) 100%)",
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
            padding: "64px 76px",
            fontFamily: "Brand",
            color: PAPER,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="62" height="53" viewBox={`0 0 ${MARK.w} ${MARK.h}`} fill={PAPER}>
              <path d={MARK.d} />
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: CLUB_LIGHT }}>EARLY ACCESS</div>
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontFamily: "Brand Extrabold",
                fontWeight: 800,
                fontSize: 118,
                letterSpacing: 0,
                lineHeight: 0.95,
              }}
            >
              JOIN THE LIST
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 32, maxWidth: 760, lineHeight: 1.3, letterSpacing: -0.4 }}>
              Departures open to the list before they go on sale.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, letterSpacing: 2.5 }}>
            <div style={{ display: "flex" }}>TELLURIDE · WINTER 2026 / 2027</div>
            <div style={{ display: "flex" }}>outrider.travel/waitlist</div>
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
