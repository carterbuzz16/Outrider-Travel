import { headers } from "next/headers";
import { ipFromHeaders } from "@/lib/ip";

/** The caller's IP, as far as it can be trusted. See lib/ip.ts for which header wins and why. */
export async function clientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}
