import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { HORIZONTAL } from "@/components/ui/Logo";

/*
 * The card that renders whenever an Outrider link is pasted into a group chat,
 * an Instagram bio or a text message. For a company sold chapter to chapter,
 * that preview is the first impression far more often than the site is.
 *
 * A small capital label at the head, the plain Outrider lock-up large, and both
 * trips named at the foot. Espresso ground with club blue as the accent.
 *
 * 3 November 2026: the Ski Club lock-up and "TELLURIDE 2026 / 2027" went, since
 * a card that opens on SKI CLUB says the company only does one thing. The
 * hairlines went with them (Carter's rule for public pages). Words and vector
 * only, so the card stays small enough for every chat app to fetch; the place
 * photographs would have added over a megabyte of PNG.
 *
 * The lock-up is drawn from the master's vector paths: Satori (which renders
 * this) cannot load the site's webfonts, and the artwork is already vector.
 */

export const alt = "Outrider. Small-group travel for college.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ESPRESSO = "#3E342F";
const PAPER = "#F2EFEA";
const CLUB_LIGHT = "#A3C4D2"; // club-light: 6.6:1 on espresso, legible at 22px

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
  const lockupHeight = Math.round((lockupWidth * HORIZONTAL.h) / HORIZONTAL.w);

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
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, letterSpacing: 2.5 }}>
          <div style={{ display: "flex" }}>SMALL-GROUP TRAVEL FOR COLLEGE</div>
          <div style={{ display: "flex", color: CLUB_LIGHT }}>outrider.travel</div>
        </div>

        <svg width={lockupWidth} height={lockupHeight} viewBox={`0 0 ${HORIZONTAL.w} ${HORIZONTAL.h}`} fill={PAPER}>
          <path d={HORIZONTAL.mark} />
          <path d={HORIZONTAL.word} />
        </svg>

        <div style={{ display: "flex", fontSize: 40, letterSpacing: -0.5 }}>Ski in Telluride. Spring break in Punta Cana.</div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Brand", data: medium, style: "normal", weight: 500 }],
    },
  );
}
