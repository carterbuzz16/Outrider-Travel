/*
 * Makes public.ambassadors match Carter's roster (29 October 2026).
 *
 *   npx tsx scripts/seed-ambassadors.ts <final.csv> [--code-only <csv>] [--remove <csv>]            prints the SQL
 *   npx tsx scripts/seed-ambassadors.ts <final.csv> [--code-only <csv>] [--remove <csv>] --preview  prints a read-only list of every change
 *   SEED_DATABASE_URL=postgres://... npx tsx scripts/seed-ambassadors.ts ... --apply
 *
 * Three lists, each a CSV with a header row. They hold people's names and
 * handles, so they stay out of the repo: pass their paths.
 *
 *   final        the ambassadors, the only ones with the portal. Columns code,
 *                name, school, chapter, instagram, and either status
 *                (onboarded or accepted) or group, Carter's column
 *                ("accepted Oct 29"), read by its first word. Others ignored.
 *   --code-only  earlier ambassadors who keep their $0 code but lose the
 *                portal (code, name, instagram; others ignored).
 *   --remove     people who are not ambassadors (name, instagram; others
 *                ignored). Any ambassadors row with their handle goes, and its
 *                code is switched off.
 *
 * What the SQL does, safe to run any number of times (in one transaction
 * where the client honours BEGIN; the Supabase SQL editor runs statement by
 * statement, which is fine because each step is idempotent):
 *
 *   1. stops, changing nothing, if a final code already takes money off (a
 *      discount code can never double as an ambassador's), if a booking has
 *      used a code-only code that still has the portal (Carter wants to hear
 *      about that first), or if a booking has used a code that is about to be
 *      removed;
 *   2. creates each missing final code the way scripts/ambassador-codes.sql
 *      made the first 25: amount 0, 1,000 uses, expiring at the end of
 *      December 4 Central (January's close), noted "Ambassador attribution
 *      code ($0) for <Name>, <School>. Created <date>.";
 *   3. upserts the final ambassadors: name, school, chapter, Instagram and
 *      status from the list, and the phone and email from their newest
 *      /ambassador application with the same Instagram handle. An email or
 *      phone already on a row (Carter may have typed one in) is kept, an email
 *      another ambassador already has is left off, and a status the portal has
 *      moved on (active, earned, released, dropped) is kept;
 *   4. sets the code-only ambassadors to status code_only. Their rows stay, so
 *      /admin/ambassadors still counts their bookings and their ?ref= links
 *      still work; lib/ambassador-rules.ts keeps them out of the portal, the
 *      leaderboard and the welcome email. Their codes are not touched;
 *   5. switches off the removed people's codes (kept, with any redemptions)
 *      and deletes their ambassadors rows.
 *
 * Anyone in none of the lists (TESTCARTER) is left alone.
 *
 * It needs the ambassador_portal and ambassador_welcome_and_code_only
 * migrations.
 *
 * The Supabase SQL editor has twice answered a run that fully committed
 * with 'relation "seed_ambassadors" does not exist' (29 October 2026, both
 * the first seed and the roster sync). Don't rerun on the strength of that
 * error: run --preview, and if it lists only "left alone" rows, every change
 * is in.
 *
 * --apply writes only to SEED_DATABASE_URL, never to DATABASE_URL from
 * .env.local, so it cannot reach production by accident. For production,
 * Carter pastes the printed SQL into the Supabase SQL editor himself.
 */

import { readFileSync } from "node:fs";

const EXPIRES_AT = "2026-12-05 05:59:59+00";
const PROGRAM = "telluride-2026";
/** The date a new code's note says it was made, in Central: "Created 2026-10-29." */
const CREATED = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

type Row = { code: string; name: string; school: string; chapter: string | null; instagram: string; status: "onboarded" | "accepted" };
/** An earlier ambassador who keeps their code but not the portal. */
type CodeOnly = { code: string; name: string; instagram: string };
/** Someone who applied and is not an ambassador. */
type Removed = { name: string; instagram: string };

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

/** The header and body of a CSV file, with a column finder. */
function readCsv(path: string) {
  const [header, ...body] = parseCsv(readFileSync(path, "utf8").replace(/^\ufeff/, ""));
  const names = header.map((h) => h.trim().toLowerCase());
  const col = (name: string) => {
    const i = names.indexOf(name);
    if (i < 0) throw new Error(`${path} has no "${name}" column.`);
    return i;
  };
  return { body, col, has: (name: string) => names.includes(name) };
}

const CODE = /^[A-Z0-9]{3,32}$/;
const HANDLE = /^[a-z0-9._]{1,30}$/;
const handle = (raw: string) => raw.trim().replace(/^@/, "").toLowerCase();

function readRows(path: string): Row[] {
  const { body, col, has } = readCsv(path);
  // The 29 Oct final roster says "group" ("accepted Oct 29", "onboarded
  // before Oct 29") where the first list said "status".
  const at = {
    code: col("code"),
    name: col("name"),
    school: col("school"),
    chapter: col("chapter"),
    instagram: col("instagram"),
    status: has("status") ? col("status") : col("group"),
  };

  const seen = new Set<string>();
  return body.map((cells, n) => {
    const line = n + 2;
    const cell = (k: keyof typeof at) => (cells[at[k]] ?? "").trim();
    const code = cell("code").toUpperCase();
    const name = cell("name");
    const instagram = handle(cell("instagram"));
    const status = cell("status").toLowerCase().split(" ")[0];
    if (!CODE.test(code)) throw new Error(`Line ${line}: code "${code}" must be 3 to 32 letters and digits.`);
    if (seen.has(code)) throw new Error(`Line ${line}: ${code} is listed twice.`);
    seen.add(code);
    if (!name || name.length > 120) throw new Error(`Line ${line}: ${code} needs a name.`);
    if (!HANDLE.test(instagram)) throw new Error(`Line ${line}: ${code}'s Instagram "${instagram}" isn't a handle.`);
    if (status !== "onboarded" && status !== "accepted") throw new Error(`Line ${line}: ${code}'s status must be onboarded or accepted.`);
    return { code, name, school: cell("school"), chapter: cell("chapter") || null, instagram, status };
  });
}

function readCodeOnly(path: string): CodeOnly[] {
  const { body, col } = readCsv(path);
  const at = { code: col("code"), name: col("name"), instagram: col("instagram") };
  return body.map((cells, n) => {
    const code = (cells[at.code] ?? "").trim().toUpperCase();
    const instagram = handle(cells[at.instagram] ?? "");
    if (!CODE.test(code)) throw new Error(`${path} line ${n + 2}: code "${code}" must be 3 to 32 letters and digits.`);
    if (!HANDLE.test(instagram)) throw new Error(`${path} line ${n + 2}: ${code}'s Instagram "${instagram}" isn't a handle.`);
    return { code, name: (cells[at.name] ?? "").trim(), instagram };
  });
}

function readRemoved(path: string): Removed[] {
  const { body, col } = readCsv(path);
  const at = { name: col("name"), instagram: col("instagram") };
  return body.map((cells, n) => {
    const instagram = handle(cells[at.instagram] ?? "");
    if (!HANDLE.test(instagram)) throw new Error(`${path} line ${n + 2}: Instagram "${instagram}" isn't a handle.`);
    return { name: (cells[at.name] ?? "").trim(), instagram };
  });
}

/** Nobody may be in two lists: the SQL would do two opposite things to them. */
function checkDisjoint(rows: Row[], codeOnly: CodeOnly[], removed: Removed[]) {
  const finalCodes = new Set(rows.map((r) => r.code));
  const finalHandles = new Set(rows.map((r) => r.instagram));
  const both = [
    ...codeOnly.filter((c) => finalCodes.has(c.code) || finalHandles.has(c.instagram)).map((c) => c.code),
    ...removed.filter((r) => finalHandles.has(r.instagram)).map((r) => r.name),
    ...removed.filter((r) => codeOnly.some((c) => c.instagram === r.instagram)).map((r) => r.name),
  ];
  if (both.length > 0) throw new Error(`In two lists at once: ${[...new Set(both)].join(", ")}.`);
  const dupes = codeOnly.map((c) => c.code).filter((c, i, all) => all.indexOf(c) !== i);
  if (dupes.length > 0) throw new Error(`Listed twice in --code-only: ${dupes.join(", ")}.`);
}

/** A SQL string literal. Every value is also checked above; this is what makes any text safe. */
function lit(value: string | null): string {
  return value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`;
}

type Lists = { rows: Row[]; codeOnly: CodeOnly[]; removed: Removed[] };

function seedTable({ rows, codeOnly, removed }: Lists): string {
  const values = rows
    .map((r) => `  (${[r.code, r.name, r.school || null, r.chapter, r.instagram, r.status].map(lit).join(", ")})`)
    .join(",\n");
  // A plain session temp table, dropped at the end: the Supabase SQL editor
  // runs each statement on its own, so ON COMMIT DROP would lose the table
  // before the inserts below ever read it.
  const codeOnlyValues = codeOnly.map((c) => `  (${[c.code, c.name, c.instagram].map(lit).join(", ")})`).join(",\n");
  const removedValues = [...new Map(removed.map((r) => [r.instagram, r])).values()]
    .map((r) => `  (${[r.name, r.instagram].map(lit).join(", ")})`)
    .join(",\n");
  return `DROP TABLE IF EXISTS pg_temp.seed_ambassadors;
DROP TABLE IF EXISTS pg_temp.seed_code_only;
DROP TABLE IF EXISTS pg_temp.seed_removed;
CREATE TEMP TABLE seed_ambassadors (code TEXT PRIMARY KEY, name TEXT NOT NULL, school TEXT, chapter TEXT, instagram TEXT NOT NULL, status TEXT NOT NULL);
INSERT INTO seed_ambassadors (code, name, school, chapter, instagram, status) VALUES
${values};
CREATE TEMP TABLE seed_code_only (code TEXT PRIMARY KEY, name TEXT, instagram TEXT NOT NULL);
${codeOnlyValues ? `INSERT INTO seed_code_only (code, name, instagram) VALUES\n${codeOnlyValues};` : "-- (no --code-only list)"}
CREATE TEMP TABLE seed_removed (name TEXT, instagram TEXT PRIMARY KEY);
${removedValues ? `INSERT INTO seed_removed (name, instagram) VALUES\n${removedValues};` : "-- (no --remove list)"}`;
}

/**
 * The same three lists as WITH clauses, for the preview: a plain SELECT, so it
 * can run anywhere without creating anything.
 */
function seedCtes({ rows, codeOnly, removed }: Lists): string {
  const cte = (name: string, columns: string[], tuples: (string | null)[][]) =>
    tuples.length > 0
      ? `${name}(${columns.join(", ")}) AS (VALUES\n${tuples.map((t) => `  (${t.map(lit).join(", ")})`).join(",\n")})`
      : `${name}(${columns.join(", ")}) AS (SELECT ${columns.map(() => "NULL::text").join(", ")} WHERE false)`;
  return [
    cte(
      "seed_ambassadors",
      ["code", "name", "school", "chapter", "instagram", "status"],
      rows.map((r) => [r.code, r.name, r.school || null, r.chapter, r.instagram, r.status]),
    ),
    cte("seed_code_only", ["code", "name", "instagram"], codeOnly.map((c) => [c.code, c.name, c.instagram])),
    cte(
      "seed_removed",
      ["name", "instagram"],
      [...new Map(removed.map((r) => [r.instagram, r])).values()].map((r) => [r.name, r.instagram]),
    ),
  ].join(",\n");
}

/** The ambassadors rows of the people on the --remove list, never someone on the final list. */
const REMOVED_ROWS = `SELECT a.code FROM public.ambassadors a JOIN seed_removed s ON s.instagram = a.instagram
  WHERE a.code NOT IN (SELECT code FROM seed_ambassadors)`;

/** The newest application per handle, preferring one that has an email. */
const APPLICATION = `LEFT JOIN LATERAL (
  SELECT x.phone, NULLIF(lower(btrim(x.email)), '') AS email
  FROM public.ambassador_applications x
  WHERE x.instagram = s.instagram
  ORDER BY (x.email IS NOT NULL) DESC, x.created_at DESC
  LIMIT 1
) a ON true`;

function seedSql(lists: Lists): string {
  const { rows, codeOnly, removed } = lists;
  return `-- Ambassador roster sync (scripts/seed-ambassadors.ts): ${rows.length} with the portal,
-- ${codeOnly.length} code only, ${removed.length} not ambassadors. One transaction; safe to rerun.
BEGIN;

${seedTable(lists)}

-- 1. Anything that needs a person to look at it first stops everything.
DO $$
DECLARE bad TEXT;
BEGIN
  SELECT string_agg(c.code, ', ') INTO bad
  FROM seed_ambassadors s JOIN public.discount_codes c ON c.code = s.code
  WHERE c.amount <> 0 OR c.percent_off IS NOT NULL;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'These codes already take money off, so they cannot be ambassador codes: %', bad;
  END IF;

  SELECT string_agg(DISTINCT a.code, ', ') INTO bad
  FROM seed_code_only s
  JOIN public.ambassadors a ON a.code = s.code
  JOIN public.discount_redemptions r ON r.code = a.code
  WHERE a.status <> 'code_only';
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Bookings already use these codes. Check with Carter before taking their portal away: %', bad;
  END IF;

  SELECT string_agg(DISTINCT r.code, ', ') INTO bad
  FROM public.discount_redemptions r WHERE r.code IN (${REMOVED_ROWS});
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Bookings use these codes, so their ambassadors rows stay. Check with Carter: %', bad;
  END IF;
END $$;

-- 2. The missing $0 codes, in the existing format.
INSERT INTO public.discount_codes (code, amount, max_uses, once_per_person, active, expires_at, note)
SELECT s.code, 0, 1000, false, true, timestamptz ${lit(EXPIRES_AT)},
       'Ambassador attribution code ($0) for ' || s.name || coalesce(', ' || s.school, '') || '. Created ${CREATED}.'
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
  updated_at = now()
-- Only rows that actually differ are touched, so a rerun changes nothing.
WHERE (public.ambassadors.name, public.ambassadors.school, public.ambassadors.chapter, public.ambassadors.instagram)
        IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.school, EXCLUDED.chapter, EXCLUDED.instagram)
   OR (public.ambassadors.phone IS NULL AND EXCLUDED.phone IS NOT NULL)
   OR (public.ambassadors.email IS NULL AND EXCLUDED.email IS NOT NULL)
   OR (public.ambassadors.status IN ('onboarded', 'accepted', 'code_only') AND public.ambassadors.status <> EXCLUDED.status);

-- 4. Earlier ambassadors: their code and row stay, the portal goes.
UPDATE public.ambassadors a SET status = 'code_only', updated_at = now()
FROM seed_code_only s
WHERE a.code = s.code AND a.status <> 'code_only';

-- 5. Not ambassadors: the code is switched off (kept, with its history) and
-- the row goes. Step 1 already stopped if a booking used one.
UPDATE public.discount_codes SET active = false
WHERE code IN (${REMOVED_ROWS}) AND active;
DELETE FROM public.ambassadors WHERE code IN (${REMOVED_ROWS});

COMMIT;
DROP TABLE IF EXISTS pg_temp.seed_ambassadors;
DROP TABLE IF EXISTS pg_temp.seed_code_only;
DROP TABLE IF EXISTS pg_temp.seed_removed;

-- Check: who has the portal now, and who still needs an email to sign in.
SELECT count(*) FILTER (WHERE status NOT IN ('code_only', 'dropped')) AS portal_access,
       count(*) FILTER (WHERE status NOT IN ('code_only', 'dropped') AND email IS NULL) AS portal_without_email,
       count(*) FILTER (WHERE status = 'code_only') AS code_only,
       count(*) AS rows
FROM public.ambassadors WHERE program = ${lit(PROGRAM)};
`;
}

/**
 * Read-only: one line per row the SQL would change, and what it would do.
 * Nothing on the list means nothing changes.
 */
function previewSql(lists: Lists): string {
  return `-- Read-only preview (scripts/seed-ambassadors.ts --preview). One SELECT; changes nothing.
WITH ${seedCtes(lists)},
m AS (
  SELECT s.*, a.email AS app_email FROM seed_ambassadors s
  ${APPLICATION}
)
SELECT 'add ambassador' AS change, m.code, m.name,
       CASE WHEN m.app_email IS NULL THEN 'no email found' ELSE 'email from application' END AS detail
FROM m WHERE NOT EXISTS (SELECT 1 FROM public.ambassadors x WHERE x.code = m.code)
UNION ALL
SELECT 'add $0 code', s.code, s.name, 'expires ' || ${lit(EXPIRES_AT)}
FROM seed_ambassadors s WHERE NOT EXISTS (SELECT 1 FROM public.discount_codes c WHERE c.code = s.code)
UNION ALL
SELECT 'STOP: code takes money off', c.code, s.name, c.amount::text
FROM seed_ambassadors s JOIN public.discount_codes c ON c.code = s.code WHERE c.amount <> 0 OR c.percent_off IS NOT NULL
UNION ALL
SELECT 'update ambassador', a.code, a.name, concat_ws('; ',
  CASE WHEN a.name IS DISTINCT FROM s.name THEN 'name ' || a.name || ' -> ' || s.name END,
  CASE WHEN a.school IS DISTINCT FROM s.school THEN 'school ' || coalesce(a.school, '') || ' -> ' || s.school END,
  CASE WHEN a.chapter IS DISTINCT FROM s.chapter THEN 'chapter ' || coalesce(a.chapter, '(none)') || ' -> ' || coalesce(s.chapter, '(none)') END,
  CASE WHEN a.instagram IS DISTINCT FROM s.instagram THEN 'instagram ' || coalesce(a.instagram, '') || ' -> ' || s.instagram END,
  CASE WHEN a.status IN ('onboarded', 'accepted', 'code_only') AND a.status <> s.status THEN 'status ' || a.status || ' -> ' || s.status END,
  CASE WHEN a.email IS NULL AND m.app_email IS NOT NULL THEN 'email from application' END)
FROM seed_ambassadors s JOIN public.ambassadors a ON a.code = s.code JOIN m ON m.code = s.code
WHERE (a.name, a.school, a.chapter, a.instagram) IS DISTINCT FROM (s.name, s.school, s.chapter, s.instagram)
   OR (a.status IN ('onboarded', 'accepted', 'code_only') AND a.status <> s.status)
   OR (a.email IS NULL AND m.app_email IS NOT NULL)
UNION ALL
SELECT 'portal without email', a.code, a.name, 'cannot sign in until an email is added'
FROM seed_ambassadors s JOIN public.ambassadors a ON a.code = s.code JOIN m ON m.code = s.code
WHERE a.email IS NULL AND m.app_email IS NULL
UNION ALL
SELECT 'to code only (portal off, code kept)', a.code, a.name,
       a.status || ' -> code_only; ' || (SELECT count(*) FROM public.discount_redemptions r WHERE r.code = a.code) || ' redemptions'
FROM seed_code_only s JOIN public.ambassadors a ON a.code = s.code WHERE a.status <> 'code_only'
UNION ALL
SELECT 'code-only listed, no row', s.code, s.name, 'nothing to do'
FROM seed_code_only s WHERE NOT EXISTS (SELECT 1 FROM public.ambassadors a WHERE a.code = s.code)
UNION ALL
SELECT 'remove row, switch code off', a.code, a.name,
       (SELECT count(*) FROM public.discount_redemptions r WHERE r.code = a.code) || ' redemptions'
FROM public.ambassadors a WHERE a.code IN (${REMOVED_ROWS})
UNION ALL
SELECT 'STOP: not an ambassador but has a live $0 code', c.code, s.name, c.note
FROM seed_removed s JOIN public.discount_codes c
  ON c.amount = 0 AND c.active AND c.note ILIKE '%for ' || s.name || ',%'
WHERE c.code NOT IN (${REMOVED_ROWS})
UNION ALL
SELECT 'left alone (in no list)', a.code, a.name, a.status
FROM public.ambassadors a
WHERE a.code NOT IN (SELECT code FROM seed_ambassadors) AND a.code NOT IN (SELECT code FROM seed_code_only)
  AND a.code NOT IN (${REMOVED_ROWS})
ORDER BY 1, 2;
`;
}

const USAGE =
  "Usage: npx tsx scripts/seed-ambassadors.ts <final.csv> [--code-only <csv>] [--remove <csv>] [--sql | --preview | --apply]";

async function main() {
  const args = process.argv.slice(2);
  const take = (flag: string) => {
    const i = args.indexOf(flag);
    if (i < 0) return null;
    const value = args[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} needs a CSV path.\n${USAGE}`);
    args.splice(i, 2);
    return value;
  };
  const codeOnlyPath = take("--code-only");
  const removePath = take("--remove");
  const [path, mode = "--sql", ...extra] = args;
  if (!path || extra.length > 0) {
    console.error(USAGE);
    process.exit(1);
  }
  const lists: Lists = {
    rows: readRows(path),
    codeOnly: codeOnlyPath ? readCodeOnly(codeOnlyPath) : [],
    removed: removePath ? readRemoved(removePath) : [],
  };
  checkDisjoint(lists.rows, lists.codeOnly, lists.removed);

  if (mode === "--sql") {
    process.stdout.write(seedSql(lists));
    return;
  }
  if (mode === "--preview") {
    process.stdout.write(previewSql(lists));
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
      const results = await client.query(seedSql(lists));
      const last = Array.isArray(results) ? results[results.length - 1] : results;
      console.log(last.rows);
    } finally {
      await client.end();
    }
    return;
  }
  console.error(`Unknown mode ${mode}.\n${USAGE}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
