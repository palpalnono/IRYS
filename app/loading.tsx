// The `DashboardSkeleton` handles the initial layout while data is being fetched.
import Header from "@/components/Header";

export default function Loading() {
  return (
    <div className="app density-comfortable" data-screen-label="Loading">
      <div className="bg-spotlight" />
      <Header view="overview" />
      <main className="overview">
        <div className="kpi-row">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-tile">
              <div className="skeleton skeleton-line" style={{ width: "55%", height: 12 }} />
              <div className="skeleton skeleton-block" style={{ height: 88, marginTop: 14 }} />
              <div className="skeleton skeleton-line" style={{ width: "40%", height: 10, marginTop: 10 }} />
            </div>
          ))}
        </div>
        <div className="mid-row">
          <div className="card"><div className="skeleton skeleton-block" style={{ height: 240 }} /></div>
          <div className="card wide"><div className="skeleton skeleton-block" style={{ height: 240 }} /></div>
        </div>
        <div className="card unit-table-card">
          <div className="skeleton skeleton-block" style={{ height: 320 }} />
        </div>
      </main>
    </div>
  );
}
