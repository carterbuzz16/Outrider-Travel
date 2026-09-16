import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MARK_D } from "@/components/ui/Logo";

/*
 * The card for the link that actually gets handed out.
 *
 * /waitlist is the Instagram bio link and the one pasted into chapter group
 * chats, so its preview is a photograph and an instruction rather than the
 * brand card every other page uses. Same construction as app/opengraph-image:
 * vector artwork, the vendored static DM Mono, no network calls at build.
 */

export const alt = "Join the Outrider list. Telluride, winter 2026 and 2027.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#F1E9DC";
// Teal-light, the charcoal scheme's accent. Kept to the short eyebrow, where it
// sits on the darkest part of the wash; the URL is cream so it survives the
// brighter snow in the bottom right.
const TEAL = "#759EA4";

export default async function WaitlistOpengraphImage() {
  const [mono, photo] = await Promise.all([
    readFile(path.join(process.cwd(), "app/fonts/DMMono-Medium.ttf")),
    readFile(path.join(process.cwd(), "public/images/telluride/alpenglow.jpg")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#1A1A1A" }}>
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
            background: "linear-gradient(90deg, rgba(26,26,26,0.92) 0%, rgba(26,26,26,0.75) 60%, rgba(26,26,26,0.45) 100%)",
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
            fontFamily: "DM Mono",
            color: CREAM,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="58" height="48" viewBox="0 0 99.393 83.367" fill={CREAM}>
              <path d={MARK_D} />
            </svg>
            <div style={{ display: "flex", marginLeft: 22, fontSize: 22, letterSpacing: 6 }}>OUTRIDER</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: TEAL }}>EARLY ACCESS</div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 104, letterSpacing: -4, lineHeight: 1 }}>
              JOIN THE LIST
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 30, maxWidth: 760, lineHeight: 1.35 }}>
              Departures open to the list before they go on sale.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 4 }}>
            <div style={{ display: "flex" }}>TELLURIDE · WINTER 2026 / 2027</div>
            <div style={{ display: "flex" }}>outrider.travel/waitlist</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "DM Mono", data: mono, style: "normal", weight: 500 }],
    },
  );
}
