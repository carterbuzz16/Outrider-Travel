/**
 * Fills in the owner's email templates (lib/email/templates/*) without
 * touching their markup.
 *
 * Deliberately tiny rather than a templating library: the files use three
 * constructs and nothing else, and every byte outside them has to come out
 * exactly as it went in.
 *
 *   {{name}}                          replaced with the HTML-escaped value.
 *   <!-- {{#unless flag}} -->         on a line of its own, opening a block.
 *   <!-- {{/unless}} -->              on a line of its own, closing it.
 *   [STREET ADDRESS] [CITY, STATE ZIP]  the footer's postal address.
 *
 * An unless block is removed, marker lines and all, when its flag is true. When
 * the flag is false only the two marker lines go and the block stays. Whole
 * lines are removed so no indented blank line is left where a marker was.
 *
 * The chase template also carries a note to its implementer in an HTML
 * comment that quotes the block syntax. That comment is instructions, not
 * markup (a mail client ignores it), and it would otherwise ship internal notes
 * to every recipient's "view source" and trip the leftover-placeholder check,
 * so it is dropped. It is the only comment that is.
 *
 * Pure and dependency-free, so it can be exercised outside Next.
 */

export type TemplateVariables = Record<string, string>;
export type TemplateFlags = Record<string, boolean>;

const BLOCK = /^[ \t]*<!-- \{\{#unless (\w+)\}\} -->\r?\n([\s\S]*?)^[ \t]*<!-- \{\{\/unless\}\} -->\r?\n/gm;
const PLACEHOLDER = /\{\{(\w+)\}\}/g;
// An HTML comment that still mentions block syntax once the real blocks are
// gone: the implementer's note. Non-greedy, so it stops at its own "-->".
const TEMPLATE_NOTE = /^[ \t]*<!--(?:(?!-->)[\s\S])*?\{\{[#/]unless[\s\S]*?-->[ \t]*\r?\n(?:[ \t]*\r?\n)?/gm;

export class TemplateRenderError extends Error {
  constructor(
    message: string,
    /** Variables the template asked for that were not supplied. */
    readonly missing: string[] = [],
  ) {
    super(message);
    this.name = "TemplateRenderError";
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Every {{name}} the template uses, block flags excluded. */
export function templateVariables(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER)) names.add(match[1]);
  return [...names].sort();
}

export function renderTemplate(
  template: string,
  opts: {
    variables: TemplateVariables;
    flags?: TemplateFlags;
    postalAddress: { street: string; cityStateZip: string };
  },
): string {
  const { variables, flags = {}, postalAddress } = opts;

  // 1. Conditional blocks. An unknown flag is an error rather than a guess:
  //    silently showing (or hiding) a block is how a wrong email goes out.
  const unknownFlags = new Set<string>();
  let html = template.replace(BLOCK, (_whole, flag: string, body: string) => {
    if (!(flag in flags)) {
      unknownFlags.add(flag);
      return body;
    }
    return flags[flag] ? "" : body;
  });
  if (unknownFlags.size > 0) {
    throw new TemplateRenderError(`No value for block flag(s): ${[...unknownFlags].join(", ")}`, [...unknownFlags]);
  }

  // 2. The implementer's note (see the header comment).
  html = html.replace(TEMPLATE_NOTE, "");

  // 3. Variables. Collect every missing one before failing, so the log names
  //    them all at once instead of one per attempt.
  const missing = new Set<string>();
  html = html.replace(PLACEHOLDER, (whole, name: string) => {
    const value = variables[name];
    if (value === undefined || value === "") {
      missing.add(name);
      return whole;
    }
    return escapeHtml(value);
  });
  if (missing.size > 0) {
    throw new TemplateRenderError(`Missing template variable(s): ${[...missing].sort().join(", ")}`, [
      ...missing,
    ]);
  }

  // 4. Footer address. split/join rather than replace, so a "$" in the
  //    address could never be read as a replacement pattern.
  html = html
    .split("[STREET ADDRESS]")
    .join(escapeHtml(postalAddress.street))
    .split("[CITY, STATE ZIP]")
    .join(escapeHtml(postalAddress.cityStateZip));

  // 5. The last line of defence. A render with anything left over is not
  //    sent; the caller falls back or skips.
  if (html.includes("{{") || html.includes("}}") || html.includes("[STREET") || html.includes("[CITY")) {
    throw new TemplateRenderError("Rendered email still contains template markers");
  }

  return html;
}
