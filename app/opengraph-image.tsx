import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MARK_D, WORDMARK_D } from "@/components/ui/Logo";

/*
 * The card that renders whenever an Outrider link is pasted into a group chat,
 * an Instagram bio or a text message. For a company sold chapter to chapter,
 * that preview is the first impression far more often than the site is.
 *
 * The wordmark and the mark are drawn as vector paths rather than set in a
 * font: Satori (which renders this) does not load the site's webfonts, and the
 * artwork is already vector. Only the small supporting text needs a face.
 */

export const alt = "Outrider. Small-group ski weeks and spring break trips.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1A1A1A";
const CREAM = "#F1E9DC";
const TEAL = "#759EA4";

export default async function OpengraphImage() {
  /*
   * A STATIC DM Mono, not the variable Geist that next/font uses for the site.
   * Satori parses static TTF/OTF/WOFF only: handed a variable font it throws
   * "Cannot read properties of undefined (reading '256')" while reading the
   * weight axis. Vendored into the repo so the build makes no network call.
   */
  const mono = await readFile(path.join(process.cwd(), "app/fonts/DMMono-Medium.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <svg width="96" height="80" viewBox="0 0 99.393 83.367" fill={CREAM}>
            <path d={MARK_D} />
          </svg>
          <div
            style={{
              display: "flex",
              fontFamily: "DM Mono",
              fontSize: 22,
              letterSpacing: 6,
              color: TEAL,
            }}
          >
            TELLURIDE 2026 / 2027
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <svg width="880" height="120" viewBox="0 0 106.2 14.425" fill={CREAM}>
            <path d={WORDMARK_D} />
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", width: "100%", height: 2, background: TEAL }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "DM Mono",
                fontSize: 30,
                letterSpacing: 2,
                color: CREAM,
              }}
            >
              Ski weeks. Spring break.
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "DM Mono",
                fontSize: 22,
                letterSpacing: 4,
                color: TEAL,
              }}
            >
              outrider.travel
            </div>
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
