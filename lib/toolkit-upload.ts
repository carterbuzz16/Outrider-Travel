import { TOOLKIT_SHARED } from "@/lib/ambassador-rules";

/*
 * Checks on a toolkit graphic before it is stored (29 October 2026). The
 * admin upload (app/admin/ambassadors/toolkit/route.ts) runs every one of
 * them on the server; the file input's `accept` is only a hint. Pure, so
 * tests/toolkit-upload.test.ts can run them.
 *
 *   - images only, judged by the file's first bytes, never by its name or the
 *     type the browser claims: PNG, JPEG or WebP;
 *   - 4 MB at most: under Vercel's 4.5 MB request limit, and the bucket's own
 *     file_size_limit says the same (ambassador_portal migration);
 *   - stored under a name made here from letters, digits and dashes plus the
 *     extension the bytes call for, so nothing the uploader typed reaches a
 *     path or a download header as it stands;
 *   - into shared/ or schools/<slug>/ only.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type ImageKind = "png" | "jpg" | "webp";

export const IMAGE_MIME: Record<ImageKind, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** What the bytes say the file is, or null for anything that isn't one of the three. */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const at = (i: number) => bytes[i];
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b)) return "png";
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "jpg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(at(0), at(1), at(2), at(3)) === "RIFF" &&
    String.fromCharCode(at(8), at(9), at(10), at(11)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/** "Story 1 (TCU) FINAL.PNG" becomes "story-1-tcu-final". Never empty. */
export function safeBaseName(name: string): string {
  const base = name
    // The file's own name only: a browser can send a path, and a name can hold dots.
    .slice(Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\")) + 1)
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return base.length > 0 ? base : "graphic";
}

const SCHOOL_FOLDER = /^schools\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The folder an upload names, if it is one the toolkit serves: shared, or schools/<slug>. */
export function toolkitFolder(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value === TOOLKIT_SHARED) return value;
  return SCHOOL_FOLDER.test(value) && value.length <= 68 ? value : null;
}

/** A stored object's path as the upload writes it, for deletes: folder, then a safe name. */
export function isToolkitObjectPath(path: unknown): path is string {
  if (typeof path !== "string") return false;
  const slash = path.lastIndexOf("/");
  if (slash < 0) return false;
  return toolkitFolder(path.slice(0, slash)) !== null && /^[a-z0-9][a-z0-9-]{0,80}\.(png|jpg|webp)$/.test(path.slice(slash + 1));
}
