import { NextResponse, type NextRequest } from "next/server";
import { unsubscribeByToken } from "@/lib/unsubscribe";

/**
 * The one-click endpoint from RFC 8058, which is what Gmail's and Yahoo's own
 * unsubscribe buttons call. They POST here directly and the reader never leaves
 * their inbox. Bulk senders are required to support this.
 *
 * POST only, deliberately: a GET that unsubscribes gets triggered by every
 * client and scanner that prefetches links in a message, which would opt people
 * out who never clicked anything.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  await unsubscribeByToken(token);
  // Always 200. A different answer for an unknown token would turn this into a
  // way to test whether one exists.
  return new NextResponse(null, { status: 200 });
}
