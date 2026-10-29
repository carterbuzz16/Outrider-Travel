/*
 * Uploads a folder of story graphics into the ambassador toolkit bucket
 * (29 October 2026), for a batch too big to add one by one on
 * /admin/ambassadors.
 *
 *   npx tsx scripts/upload-toolkit.ts <folder>            lists what it would upload
 *   npx tsx scripts/upload-toolkit.ts <folder> --apply    uploads
 *
 * The folder is laid out the way the portal reads the bucket:
 *
 *   <folder>/shared/<name>.png            every ambassador sees it
 *   <folder>/schools/<slug>/<name>.png    only that school's ambassadors
 *
 * where <slug> is the school as written on the ambassador's row, made into
 * a folder name ("Texas A&M" is texas-a-m; schoolSlug in
 * lib/ambassador-rules.ts). Anything else in the folder is ignored.
 *
 * Every file gets the admin upload's checks (lib/toolkit-upload.ts): a PNG,
 * JPEG or WebP by its bytes, 4 MB at most, a safe name. A file already in
 * the bucket under the same path is left as it is and reported, never
 * overwritten. Reads the Supabase URL and service role key from .env.local.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { TOOLKIT_BUCKET } from "@/lib/ambassador-rules";
import { IMAGE_MIME, MAX_UPLOAD_BYTES, isToolkitObjectPath, sniffImage } from "@/lib/toolkit-upload";

config({ path: ".env.local" });

function files(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string) => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      if (statSync(full).isDirectory()) walk(full, r);
      else out.push(r);
    }
  };
  walk(root, "");
  return out.sort();
}

async function main() {
  const [root, mode] = process.argv.slice(2);
  if (!root) {
    console.error("Usage: npx tsx scripts/upload-toolkit.ts <folder> [--apply]");
    process.exit(1);
  }
  const apply = mode === "--apply";

  const plan: { path: string; bytes: Buffer; kind: keyof typeof IMAGE_MIME }[] = [];
  for (const rel of files(root)) {
    if (!rel.startsWith("shared/") && !rel.startsWith("schools/")) continue;
    if (!isToolkitObjectPath(rel)) {
      console.log(`skip  ${rel}  (name or folder isn't one the portal serves)`);
      continue;
    }
    const bytes = readFileSync(join(root, rel));
    const kind = sniffImage(bytes);
    if (!kind || bytes.length > MAX_UPLOAD_BYTES) {
      console.log(`skip  ${rel}  (${!kind ? "not a PNG, JPEG or WebP" : "over 4 MB"})`);
      continue;
    }
    plan.push({ path: rel, bytes, kind });
  }

  if (!apply) {
    for (const p of plan) console.log(`would upload  ${p.path}  (${Math.round(p.bytes.length / 1024)} KB)`);
    console.log(`\n${plan.length} files. Run again with --apply to upload them.`);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local.");
    process.exit(1);
  }
  const storage = createClient(url, key, { auth: { persistSession: false } }).storage.from(TOOLKIT_BUCKET);

  let uploaded = 0;
  let existing = 0;
  let failed = 0;
  // A dropped connection ("fetch failed") is retried a few times with a short
  // pause, so one blip doesn't mean running the whole batch again.
  const upload = async (p: (typeof plan)[number]) => {
    for (let attempt = 1; ; attempt++) {
      const result = await storage.upload(p.path, p.bytes, { contentType: IMAGE_MIME[p.kind], upsert: false });
      if (!result.error || !/fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(result.error.message) || attempt >= 4) {
        return result;
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  };

  for (const p of plan) {
    const { error } = await upload(p);
    if (!error) {
      uploaded += 1;
      console.log(`uploaded  ${p.path}`);
    } else if (/exists|duplicate/i.test(error.message)) {
      existing += 1;
      console.log(`already there  ${p.path}`);
    } else {
      failed += 1;
      console.log(`FAILED  ${p.path}: ${error.message}`);
    }
  }
  console.log(`\nUploaded ${uploaded}, already there ${existing}, failed ${failed}.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
