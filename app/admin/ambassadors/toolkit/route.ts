import { NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOOLKIT_BUCKET } from "@/lib/ambassador-rules";
import { IMAGE_MIME, MAX_UPLOAD_BYTES, safeBaseName, sniffImage, toolkitFolder } from "@/lib/toolkit-upload";

/*
 * POST /admin/ambassadors/toolkit: one story graphic into the private
 * toolkit bucket, from the upload form on /admin/ambassadors. A route, not a
 * server action, because actions cap a body at 1 MB and story PNGs run
 * bigger. A plain form post, so it works without scripts, and it answers by
 * redirecting back with a code (./flash.ts).
 *
 * A route handler never renders the admin layout, so the role is checked
 * here, first, on every request (lib/admin.ts). Every check on the file is
 * lib/toolkit-upload.ts.
 */

function back(request: Request, query: Record<string, string>): NextResponse {
  const url = new URL("/admin/ambassadors", request.url);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.hash = "toolkit";
  // 303: the browser follows with a GET, so a reload never posts the file twice.
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Refuse an oversized body before reading it, where the client says how big it is.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return back(request, { error: "bad_file" });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back(request, { error: "bad_file" });
  }
  const folder = toolkitFolder(form.get("folder"));
  const file = form.get("file");
  if (!folder || !(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return back(request, { error: "bad_file" });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return back(request, { error: "bad_file" });

  const storage = createAdminClient().storage.from(TOOLKIT_BUCKET);
  const base = safeBaseName(file.name);
  // Never overwrite: a second "story-1" becomes "story-1-2".
  for (let n = 1; n <= 20; n++) {
    const path = `${folder}/${n === 1 ? base : `${base}-${n}`}.${kind}`;
    const { error } = await storage.upload(path, bytes, { contentType: IMAGE_MIME[kind], upsert: false });
    if (!error) return back(request, { done: "uploaded" });
    if (!/exists|duplicate/i.test(error.message)) {
      console.error(`toolkit upload ${path}: ${error.message}`);
      break;
    }
  }
  return back(request, { error: "upload_failed" });
}
