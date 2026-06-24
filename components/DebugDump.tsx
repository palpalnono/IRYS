"use client";

import { useEffect } from "react";

/**
 * Dev-only debug component — logs API data to the browser console.
 * Renders nothing and is completely inert in production builds.
 */
export default function DebugDump({ sys, data }: { sys: string; data: unknown }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`API History Dump [${sys}]:`, data);
    }
  }, [sys, data]);

  return null;
}
