/*
 * Seeds the ambassadors in play from Carter's list (29 October 2026).
 *
 *   npx tsx scripts/seed-ambassadors.ts <ambassadors.csv>            prints the SQL
 *   npx tsx scripts/seed-ambassadors.ts <ambassadors.csv> --preview  prints a read-only check
 *   SEED_DATABASE_URL=postgres://... npx tsx scripts/seed-ambassadors.ts <ambassadors.csv> --apply
 *
 * The CSV has a header row: code,name,school,chapter,instagram,status,code_exists
 * (status is onboarded or accepted; code_exists is informational, the SQL
 * checks for itself). It holds people's names and handles, so it stays out of
 * the repo: pass its path.
 *
 * What the SQL does, in one transaction, safe to run any number of times:
 *
 *   1. refuses to go on if any listed code already exists as a code that
 *      takes money off: a discount code can never double as an ambassador's;
 *   2. creates each missing code the way scripts/ambassador-codes.sql made the
 *      first 25: amount 0, 1,000 uses, expiring at the end of December 4
 *      Central (January's close), noted "Ambassador attribution code ($0) for <Name>, <School>.";
 *   3. upserts public.ambassadors: name, school, chapter, Instagram and status
 *      from the list, and the phone and email from their newest
 *      /ambassador application with the same Instagram handle. An email or
 *      phone already on a row (Carter may have typed one in) is kept, an email
 *      another ambassador already has is left off, and a status the portal or
 *      the team has moved on (active, earned, released, dropped) is kept.
 *
 * It needs the ambassador_portal migration (chapter, status, program).
 *
 * --apply writes only to SEED_DATABASE_URL, never to DATABASE_URL from
 * .env.local, so it cannot reach production by accident. For production,
 * Carter pastes the printed SQL into the Supabase SQL editor himself.
 */

import { readFileSync } from "node:fs";

const EXPIRES_AT = "2026-12-05 05:59:59+00";
const PROGRAM = "telluride-2026";

type Row = { code: string; name: string; school: string; chapter: string | null; instagram: string; status: "onboarded" | "accepted" };

/** RFC 4180, enough for a spreadsheet export: quoted fields, doubled quotes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f.length > 0)) rows.push(row);
  return rows;
}

function readRows(path: string): Row[] {
  const [header, ...body] = parseCsv(readFileSync(path, "utf8").replace(/^﻿/, ""));
  const col = (name: string) => {
    const i = header.map((h) => h.trim().toLowerCase()).indexOf(name);
    if (i < 0) throw new Error(`The CSV has no "${name}" column.`);
    return i;
  };
  const at = { code: col("code"), name: col("name"), school: col("school"), chapter: col("chapter"), instagram: col("instagram"), status: col("status") };

  const seen = new Set<string>();
  return body.map((cells, n) => {
    const line = n + 2;
    const cell = (k: keyof typeof at) => (cells[at[k]] ?? "").trim();
    const code = cell("code").toUpperCase();
    const name = cell("name");
    const instagram = cell("instagram").replace(/^@/, "").toLowerCase();
    const status = cell("status").toLowerCase();
    if (!/^[A-Z0-9]{3,32}$/.test(code)) throw new Error(`Line ${line}: code "${code}" must be 3 to 32 letters and digits.`);
    if (seen.has(code)) throw new Error(`Line ${line}: ${code} is listed twice.`);
    seen.add(code);
    if (!name || name.length > 120) throw new Error(`Line ${line}: ${code} needs a name.`);
    if (!/^[a-z0-9._]{1,30}$/.test(instagram)) throw new Error(`Line ${line}: ${code}'s Instagram "${instagram}" isn't a handle.`);
    if (status !== "onboarded" && status !== "accepted") throw new Error(`Line ${line}: ${code}'s status must be onboarded or accepted.`);
    return { code, name, school: cell("school"), chapter: cell("chapter") || null, instagram, status };
  });
}

/** A SQL string literal. Every value is also checked above; this is what makes any text safe. */
function lit(value: string | null): string {
  return value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`;
}

function seedTable(rows: Row[]): string {
  const values = rows
    .map((r) => `  (${[r.code, r.name, r.school || null, r.chapter, r.instagram, r.status].map(lit).join(", ")})`)
    .join(",\n");
  return `CREATE TEMP TABLE seed_ambassadors (code TEXT PRIMARY KEY, name TEXT NOT NULL, school TEXT, chapter TEXT, instagram TEXT NOT NULL, status TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO seed_ambassadors (code, name, school, chapter, instagram, status) VALUES
${values};`;
}

/** The newest application per handle, preferring one that has an email. */
const APPLICATION = `LEFT JOIN LATERAL (
  SELECT x.phone, NULLIF(lower(btrim(x.email)), '') AS email
  FROM public.ambassador_applications x
  WHERE x.instagram = s.instagram
  ORDER BY (x.email IS NOT NULL) DESC, x.created_at DESC
  LIMIT 1
) a ON true`;

function seedSql(rows: Row[]): string {
  return `-- Ambassador seed, ${rows.length} rows (scripts/seed-ambassadors.ts). One transaction; safe to rerun.
BEGIN;

${seedTable(rows)}

-- 1. A listed code that takes money off stops everything.
DO $$
DECLARE bad TEXT;
BEGIN
  SELECT string_agg(c.code, ', ') INTO bad
  FROM seed_ambassadors s JOIN public.discount_codes c ON c.code = s.code
  WHERE c.amount <> 0 OR c.percent_off IS NOT NULL;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'These codes already take money off, so they cannot be ambassador codes: %', bad;
  END IF;
END $$;

-- 2. The missing $0 codes, in the existing format.
INSERT INTO public.discount_codes (code, amount, max_uses, once_per_person, active, expires_at, note)
SELECT s.code, 0, 1000, false, true, timestamptz ${lit(EXPIRES_AT)},
       'Ambassador attribution code ($0) for ' || s.name || coalesce(', ' || s.school, '') || '.'
FROM seed_ambassadors s
ON CONFLICT (code) DO NOTHING;

-- 3. The ambassadors, with phone and email from their application.
WITH matched AS (
  SELECT s.*, a.phone AS app_phone, a.email AS app_email,
         row_number() OVER (PARTITION BY a.email ORDER BY s.code) AS email_rank
  FROM seed_ambassadors s
  ${APPLICATION}
)
INSERT INTO public.ambassadors (code, name, school, chapter, instagram, status, program, phone, email)
SELECT m.code, m.name, m.school, m.chapter, m.instagram, m.status, ${lit(PROGRAM)}, m.app_phone,
       CASE
         WHEN m.app_email IS NULL OR m.email_rank > 1 THEN NULL
         WHEN EXISTS (SELECT 1 FROM public.ambassadors o WHERE o.email = m.app_email AND o.code <> m.code) THEN NULL
         ELSE m.app_email
       END
FROM matched m
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  school = EXCLUDED.school,
  chapter = EXCLUDED.chapter,
  instagram = EXCLUDED.instagram,
  phone = coalesce(public.ambassadors.phone, EXCLUDED.phone),
  email = coalesce(public.ambassadors.email, EXCLUDED.email),
  status = CASE
    WHEN public.ambassadors.status IN ('active', 'earned', 'released', 'dropped') THEN public.ambassadors.status
    ELSE EXCLUDED.status
  END,
  updated_at = now();

COMMIT;

-- Check: every listed code now has a row; how many can sign in.
SELECT count(*) AS ambassadors, count(email) AS with_email, count(*) FILTER (WHERE email IS NULL) AS need_email
FROM public.ambassadors WHERE program = ${lit(PROGRAM)};
`;
}

/** Read-only: what step 2 and 3 would do for each row, without changing anything. */
function previewSql(rows: Row[]): string {
  const values = rows.map((r) => `(${lit(r.code)}, ${lit(r.instagram)})`).join(", ");
  return `-- Read-only preview (scripts/seed-ambassadors.ts --preview).
WITH s(code, instagram) AS (VALUES ${values})
SELECT s.code,
       c.code IS NOT NULL AS code_exists,
       (c.amount <> 0 OR c.percent_off IS NOT NULL) AS code_takes_money_off,
       amb.code IS NOT NULL AS ambassador_exists,
       a.email IS NOT NULL AS email_found,
       amb.email IS NOT NULL AS email_already_set
FROM s
LEFT JOIN public.discount_codes c ON c.code = s.code
LEFT JOIN public.ambassadors amb ON amb.code = s.code
${APPLICATION}
ORDER BY s.code;
`;
}

async function main() {
  const [path, mode = "--sql"] = process.argv.slice(2);
  if (!path) {
    console.error("Usage: npx tsx scripts/seed-ambassadors.ts <ambassadors.csv> [--sql | --preview | --apply]");
    process.exit(1);
  }
  const rows = readRows(path);

  if (mode === "--sql") {
    process.stdout.write(seedSql(rows));
    return;
  }
  if (mode === "--preview") {
    process.stdout.write(previewSql(rows));
    return;
  }
  if (mode === "--apply") {
    const url = process.env.SEED_DATABASE_URL;
    if (!url) {
      console.error("--apply writes to SEED_DATABASE_URL only. Set it to a branch or local database.");
      process.exit(1);
    }
    const { Client } = await import("pg");
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      const results = await client.query(seedSql(rows));
      const last = Array.isArray(results) ? results[results.length - 1] : results;
      console.log(last.rows);
    } finally {
      await client.end();
    }
    return;
  }
  console.error(`Unknown mode ${mode}.`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
