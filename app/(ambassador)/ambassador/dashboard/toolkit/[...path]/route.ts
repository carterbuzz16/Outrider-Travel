import { getPortalAccess, signToolkitFile } from "@/lib/ambassador-portal";
import { checkRateLimit } from "@/lib/rate-limit";

/*
 * One toolkit graphic, for the signed-in ambassador only: a redirect to a
 * signed URL that works for 60 seconds (lib/ambassador-portal.ts). The
 * dashboard links here rather than to a signed URL, so a page left open for
 * an hour still works, and every view is checked against the session: the
 * shared folder and their own school's, nothing else (isToolkitPathAllowed).
 * Anything refused is a 404, so the route says nothing about what exists.
 */
export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store, max-age=0" };

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: PRIVATE });
}

export async function GET(request: Request, props: { params: Promise<{ path: string[] }> }) {
  const access = await getPortalAccess().catch((err: unknown) => {
    console.error(`toolkit file: ${err instanceof Error ? err.message : err}`);
    return null;
  });
  if (!access) return new Response("Try again shortly", { status: 503, headers: PRIVATE });
  if (access.kind !== "ambassador" || !access.ambassador.agreedAt) return notFound();
  // Thumbnails load together, so this is generous; it stops a loop, not a person.
  if (!(await checkRateLimit(`amb-file:${access.userId}`, 200, 10 * 60))) {
    return new Response("Too many requests", { status: 429, headers: { ...PRIVATE, "Retry-After": "60" } });
  }
  const { path } = await props.params;
  const download = new URL(request.url).searchParams.get("download") === "1";
  const url = await signToolkitFile(path.join("/"), access.ambassador.school, download);
  if (!url) return notFound();
  return new Response(null, { status: 302, headers: { ...PRIVATE, Location: url } });
}
