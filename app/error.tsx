"use client";
// Route-level error boundary. Must be a client component (Next requirement).
// Catches unhandled errors in the page below it and shows a recovery UI.
import { useEffect } from "react";
import Header from "@/components/Header";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for telemetry once we wire one in.
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="app density-comfortable" data-screen-label="Error">
      <div className="bg-spotlight" />
      <Header view="overview" />
      <main className="overview">
        <div className="card" style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
          <div className="card-body" style={{ padding: 28 }}>
            <div className="screen-title" style={{ marginBottom: 8 }}>Something broke</div>
            <div className="screen-sub" style={{ marginBottom: 20 }}>
              The dashboard hit an unexpected error. Try again, or refresh the page.
            </div>
            {error.digest && (
              <div className="muted" style={{ fontSize: 12, marginBottom: 20 }}>
                Reference: <code>{error.digest}</code>
              </div>
            )}
            <button className="btn primary" type="button" onClick={reset}>
              Try again
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
