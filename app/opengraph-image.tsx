import { readFile } from "node:fs/promises";
import path from "node:path";

/*
 * The card that renders whenever an Outrider link is pasted into a group chat,
 * an Instagram bio or a text message: every page without a card of its own, the
 * home page included. For a company sold chapter to chapter, that preview is the
 * first impression far more often than the site is.
 *
 * Since 5 November 2026 it is a photograph: the two trips side by side over a band
 * in the two club colours. Carter on the old one, words on espresso: "just a brown
 * background ... It needs to be an actual picture and cool." The picture is made by
 * scripts/share-cards/render.mjs as a JPEG of about 200KB, because Satori can only
 * write PNG and a photograph as PNG is over a megabyte, more than some chat apps
 * will fetch. This route only serves it, under the URL lib/metadata.ts points at.
 *
 * It names Punta Cana, so it belongs with the spring break launch: on the live site
 * spring break is still "Destination soon".
 */

export const alt = "Outrider. Ski trips in Telluride and spring break in Punta Cana.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function OpengraphImage() {
  const card = await readFile(path.join(process.cwd(), "public/og/outrider.jpg"));
  return new Response(new Uint8Array(card), { headers: { "Content-Type": contentType } });
}
