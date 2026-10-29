/* Upload checks (lib/toolkit-upload.ts) and which toolkit files an ambassador may open (lib/ambassador-rules.ts). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isToolkitObjectPath, safeBaseName, sniffImage, toolkitFolder } from "@/lib/toolkit-upload";
import { isToolkitPathAllowed, schoolSlug, toolkitFolders } from "@/lib/ambassador-rules";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);

test("images are judged by their bytes, not their name", () => {
  assert.equal(sniffImage(PNG), "png");
  assert.equal(sniffImage(JPG), "jpg");
  assert.equal(sniffImage(WEBP), "webp");
  assert.equal(sniffImage(Buffer.from("<svg onload=alert(1)>")), null);
  assert.equal(sniffImage(Buffer.from("GIF89a......")), null);
  assert.equal(sniffImage(new Uint8Array()), null);
});

test("stored names are letters, digits and dashes only", () => {
  assert.equal(safeBaseName("Story 1 (TCU) FINAL.PNG"), "story-1-tcu-final");
  assert.equal(safeBaseName("../../etc/passwd"), "passwd");
  assert.equal(safeBaseName("C:\\Users\\me\\Story v2.final.png"), "story-v2-final");
  assert.equal(safeBaseName("<script>.png"), "script");
  assert.equal(safeBaseName("....png"), "graphic");
});

test("uploads go to shared/ or schools/<slug> only", () => {
  assert.equal(toolkitFolder("shared"), "shared");
  assert.equal(toolkitFolder("schools/texas-a-m"), "schools/texas-a-m");
  assert.equal(toolkitFolder("schools/../shared"), null);
  assert.equal(toolkitFolder("schools/"), null);
  assert.equal(toolkitFolder("private"), null);
  assert.equal(toolkitFolder(null), null);
});

test("an ambassador opens shared files and their own school's, nothing else", () => {
  assert.equal(schoolSlug("Texas A&M"), "texas-a-m");
  assert.deepEqual(toolkitFolders("TCU"), ["shared", "schools/tcu"]);
  assert.deepEqual(toolkitFolders(null), ["shared"]);
  assert.equal(isToolkitPathAllowed("shared/story-1.png", "TCU"), true);
  assert.equal(isToolkitPathAllowed("schools/tcu/story-1.jpg", "TCU"), true);
  assert.equal(isToolkitPathAllowed("schools/smu/story-1.jpg", "TCU"), false);
  assert.equal(isToolkitPathAllowed("schools/tcu/../smu/story-1.jpg", "TCU"), false);
  assert.equal(isToolkitPathAllowed("shared/story.svg", "TCU"), false);
  assert.equal(isToolkitPathAllowed("story-1.png", "TCU"), false);
  assert.equal(isToolkitObjectPath("schools/tcu/story-1.png"), true);
  assert.equal(isToolkitObjectPath("schools/tcu/../x.png"), false);
});
