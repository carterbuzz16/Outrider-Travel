import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SKI_CLUB } from "@/components/ui/Logo";

/*
 * The card that renders whenever an Outrider link is pasted into a group chat,
 * an Instagram bio or a text message. For a company sold chapter to chapter,
 * that preview is the first impression far more often than the site is.
 *
 * Laid out the way the brand book lays out its own pages: a small capital
 * label over a hairline, the Ski Club lock-up in two colors, and a second
 * ruled line to close. Espresso ground with club blue as the accent.
 *
 * The lock-up is drawn from the master's vector paths: Satori (which renders
 * this) cannot load the site's webfonts, and the artwork is already vector.
 */

export const alt = "Outrider. Small-group travel for college.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ESPRESSO = "#3E342F";
const PAPER = "#F2EFEA";
const CLUB = "#89B2C4"; // club blue, as in the lock-up
const CLUB_LIGHT = "#A3C4D2"; // club-light: 6.6:1 on espresso, legible at 22px
const RULE = "rgba(242, 239, 234, 0.3)";

export default async function OpengraphImage() {
  /*
   * STATIC instances of the brand stand-in face (see app/layout.tsx), cut from
   * the variable font at 500 and 800. Satori parses static TTF/OTF/WOFF only:
   * handed a variable font it throws "Cannot read properties of undefined
   * (reading '256')" while reading the weight axis. Vendored into the repo so
   * the build makes no network call.
   */
  const medium = await readFile(path.join(process.cwd(), "app/fonts/Figtree-Medium.ttf"));

  const lockupWidth = 960;
  const lockupHeight = Math.round((lockupWidth * SKI_CLUB.h) / SKI_CLUB.w);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: ESPRESSO,
          padding: "68px 80px",
          fontFamily: "Brand",
          color: PAPER,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, letterSpacing: 2.5 }}>
            <div style={{ display: "flex" }}>SMALL-GROUP TRAVEL FOR COLLEGE</div>
            <div style={{ display: "flex", color: CLUB_LIGHT }}>TELLURIDE 2026 / 2027</div>
          </div>
          <div style={{ display: "flex", width: "100%", height: 1, marginTop: 20, background: RULE }} />
        </div>

        <svg width={lockupWidth} height={lockupHeight} viewBox={`0 0 ${SKI_CLUB.w} ${SKI_CLUB.h}`} fill={PAPER}>
          <path d={SKI_CLUB.mark} />
          <path d={SKI_CLUB.word} />
          <path d={SKI_CLUB.club} fill={CLUB} />
        </svg>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", width: "100%", height: 1, background: RULE }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 24,
            }}
          >
            <div style={{ display: "flex", fontSize: 34, letterSpacing: -0.5 }}>Ski weeks now. Spring break next.</div>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 2, color: CLUB_LIGHT }}>outrider.travel</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Brand", data: medium, style: "normal", weight: 500 }],
    },
  );
}
