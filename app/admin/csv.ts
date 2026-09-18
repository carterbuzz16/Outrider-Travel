/*
 * CSV for the back office's exports.
 *
 * Every cell is quoted, and quotes inside are doubled (RFC 4180), so commas,
 * quotes and line breaks in a traveler's free text cannot shift a column.
 *
 * Formula injection: a spreadsheet treats a cell starting with = + - @ (or a
 * tab or carriage return, which some apps strip first) as a formula. These
 * files are opened in Excel or Sheets by the owner and handed to a rental
 * shop and an insurer, and the text in them was typed by travelers, so any
 * such cell gets a leading apostrophe and is read as plain text. The cost is
 * that a phone number written "+1 970..." shows as '+1 970... in the cell.
 *
 * A byte-order mark leads the file so Excel reads it as UTF-8 and accented
 * names survive.
 */

type Cell = string | number | boolean | null | undefined;

export function csvCell(value: Cell): string {
  let text = value === null || value === undefined ? "" : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  // Leading spaces too: some importers trim a cell before deciding whether it
  // is a formula, so " =HYPERLINK(...)" is as live as "=HYPERLINK(...)".
  if (/^\s*[=+\-@]/.test(text) || /^[\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** "Telluride, CO" -> "telluride". Letters, digits and hyphens only, safe in a filename. */
export function slugify(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "trip"
  );
}
