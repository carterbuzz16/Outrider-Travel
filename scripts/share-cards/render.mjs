#!/usr/bin/env node
/*
 * The share cards: the picture iMessage, GroupMe and Instagram show when an Outrider
 * link is pasted. Carter, 5 November 2026: the old card was "just a brown background
 * with Outrider, Ski Telluride, Spring Break, Punta Cana" and "needs to be an actual
 * picture and cool".
 *
 * They are photographs, so they are made here as JPEGs rather than drawn by Satori
 * at build: Satori can only write PNG, and a photo card as PNG is over a megabyte,
 * more than some chat apps will fetch for a preview. These come out near 200KB.
 * The routes (app/opengraph-image.tsx, app/(site)/telluride/opengraph-image.tsx)
 * serve the files from public/og under the URLs the cards always had.
 *
 *   outrider.jpg   every page without a card of its own, the home page included:
 *                  the two trips side by side over a band in the two club colours,
 *                  Ski Club blue under Telluride and the spring orange under Punta Cana
 *   telluride.jpg  /telluride: the Ski Club lock-up over Carter's own golden ridge
 *
 * White type sits only where it measures: the logo 3:1 against the brightest pixel
 * behind it, the place names 4:1 and the line 6:1 (measured 5 November 2026).
 * Ink on the band is 7.7:1 on the blue and 5.2:1 on the orange.
 *
 * Run on a Mac with Google Chrome: node scripts/share-cards/render.mjs
 * Chrome renders each card at 2x, then sips makes the 1200x630 JPEG.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* Logo paths straight from the masters, never redrawn (AGENTS.md). */
const art = readFileSync(join(ROOT, "components/ui/logo-art.ts"), "utf8");
function logo(name) {
  const block = art.slice(art.indexOf(`export const ${name} = {`));
  const body = block.slice(0, block.indexOf("\n};"));
  const num = (k) => Number(body.match(new RegExp(`\\n  ${k}: ([0-9.]+)`))?.[1]);
  const str = (k) => body.match(new RegExp(`\\n  ${k}: "([^"]+)"`))?.[1];
  return { w: num("w"), h: num("h"), mark: str("mark"), word: str("word"), club: str("club") };
}
const svg = (L, width) =>
  `<svg width="${width}" height="${((width * L.h) / L.w).toFixed(1)}" viewBox="0 0 ${L.w} ${L.h}" fill="#F2EFEA">` +
  `<path d="${L.mark}"/><path d="${L.word}"/>${L.club ? `<path d="${L.club}"/>` : ""}</svg>`;

const font = (f) => `data:font/ttf;base64,${readFileSync(join(ROOT, "app/fonts", f)).toString("base64")}`;
const photo = (p) => `'file://${encodeURI(join(ROOT, "public/images", p))}'`;

const BASE = `
@font-face { font-family: F; src: url("${font("Figtree-Medium.ttf")}"); font-weight: 500; }
@font-face { font-family: F; src: url("${font("Figtree-ExtraBold.ttf")}"); font-weight: 800; }
* { margin: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; overflow: hidden; background: #1F1A17; }
body { font-family: F; color: #F2EFEA; position: relative; }
.ph { position: absolute; top: 0; background-size: cover; }
.fade { position: absolute; left: 0; right: 0; }
.caps { font-weight: 800; text-transform: uppercase; letter-spacing: -0.01em; line-height: .92; }
.small { font-weight: 500; }
.band { position: absolute; bottom: 0; width: 600px; height: 150px; color: #1F1A17; padding: 26px 52px 0; }
`;

const CARDS = {
  outrider: `
    <div class="ph" style="left:0;width:600px;bottom:150px;background-image:url(${photo("telluride/alpenglow.jpg")});background-position:45% 50%"></div>
    <div class="ph" style="left:600px;width:600px;bottom:150px;background-image:url(${photo("spring/zemi-dusk.jpg")});background-position:38% 50%"></div>
    <div class="fade" style="top:0;height:210px;background:linear-gradient(rgba(20,17,15,.72),rgba(20,17,15,0))"></div>
    <div style="position:absolute;left:52px;top:46px">${svg(logo("HORIZONTAL"), 280)}</div>
    <div class="band" style="left:0;background:#89B2C4"><div class="small" style="font-size:24px;margin-bottom:8px">Ski trips</div><div class="caps" style="font-size:64px">Telluride</div></div>
    <div class="band" style="left:600px;background:#CB7A3F"><div class="small" style="font-size:24px;margin-bottom:8px">Spring break</div><div class="caps" style="font-size:64px">Punta Cana</div></div>`,
  telluride: `
    <div class="ph" style="left:0;width:1200px;bottom:0;background-image:url(${photo("home/golden-ridge.jpg")});background-position:50% 40%"></div>
    <div class="fade" style="top:0;height:200px;background:linear-gradient(rgba(20,17,15,.55),rgba(20,17,15,0))"></div>
    <div class="fade" style="bottom:0;height:400px;background:linear-gradient(rgba(20,17,15,0),rgba(20,17,15,.72) 55%,rgba(20,17,15,.84))"></div>
    <div style="position:absolute;left:76px;top:56px">${svg(logo("SKI_CLUB"), 400)}</div>
    <div style="position:absolute;left:72px;bottom:56px">
      <div class="caps" style="font-size:166px">Telluride</div>
      <div class="small" style="font-size:32px;margin-top:20px;letter-spacing:-0.01em">Four nights with your best friends, ski-in, ski-out at The Peaks.</div>
    </div>`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const work = mkdtempSync(join(tmpdir(), "share-cards-"));

for (const [name, body] of Object.entries(CARDS)) {
  const html = join(work, `${name}.html`);
  const png = join(work, `${name}.png`);
  writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}</style></head><body>${body}</body></html>`);
  // Headless Chrome writes the screenshot and then may never exit on this Mac, so
  // it runs in its own process group and is killed once the file stops growing.
  const chrome = spawn(
    CHROME,
    [
      "--headless=new", "--hide-scrollbars", "--no-first-run", "--disable-component-update",
      `--user-data-dir=${mkdtempSync(join(tmpdir(), "share-cards-chrome-"))}`,
      "--window-size=1200,630", "--force-device-scale-factor=2", "--virtual-time-budget=5000",
      `--screenshot=${png}`, `file://${html}`,
    ],
    { stdio: "ignore", detached: true },
  );
  let last = -1;
  let steady = 0;
  for (let i = 0; i < 180 && steady < 3; i++) {
    await sleep(500);
    const size = existsSync(png) ? statSync(png).size : -1;
    steady = size > 0 && size === last ? steady + 1 : 0;
    last = size;
  }
  try {
    process.kill(-chrome.pid, "SIGKILL");
  } catch {}
  if (steady < 3) throw new Error(`Chrome did not render ${name}`);
  const out = join(ROOT, "public/og", `${name}.jpg`);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "84", "-Z", "1200", png, "--out", out], { stdio: "ignore" });
  console.log(`${out.slice(ROOT.length + 1)}  ${Math.round(statSync(out).size / 1024)} KB`);
}
