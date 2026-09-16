"use client";

import { useEffect } from "react";
import { captureFirstTouch } from "./useWaitlistSignup";

/**
 * Reads the landing URL's campaign tags before the first client navigation
 * throws them away. Renders nothing. See captureFirstTouch for why this lives
 * in memory and not in storage.
 */
export default function AttributionCapture() {
  useEffect(() => {
    captureFirstTouch();
  }, []);
  return null;
}
