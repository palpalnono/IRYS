// Branded 404 — covers notFound() from /unit/[id] and any unknown URL.
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="app density-comfortable" data-screen-label="Not Found">
      <div className="bg-spotlight" />
      <Header view="overview" />
      <main className="overview">
        <div className="card" style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
          <div className="card-body" style={{ padding: 28 }}>
            <div className="screen-title" style={{ marginBottom: 8 }}>404 — Not found</div>
            <div className="screen-sub" style={{ marginBottom: 20 }}>
              That page or unit does not exist. It may have been removed or the ID may be wrong.
            </div>
            <Link href="/" className="btn primary">Back to overview</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
