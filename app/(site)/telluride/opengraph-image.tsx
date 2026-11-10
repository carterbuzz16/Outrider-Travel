import { readFile } from "node:fs/promises";
import path from "node:path";

/*
 * /telluride's own card, the link ads and ambassadors send for the ski trip. Until 5
 * November 2026 it borrowed the site's card, words on espresso. Now it is the Ski
 * Club lock-up over Carter's own golden ridge, the club's card as /spring-break's is
 * the Beach Club's. Made by scripts/share-cards/render.mjs as a JPEG (see
 * app/opengraph-image.tsx for why); this route only serves it.
 *
 * No dates and no price: a card is pasted into group chats and kept, so it says only
 * what will not change when a trip is edited in /admin/trips.
 */

export const alt = "The Outrider Ski Club in Telluride: four nights with your best friends, ski-in, ski-out at The Peaks.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function TellurideOpengraphImage() {
  const card = await readFile(path.join(process.cwd(), "public/og/telluride.jpg"));
  return new Response(new Uint8Array(card), { headers: { "Content-Type": contentType } });
}
