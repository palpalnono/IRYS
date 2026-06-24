"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FleetDateRange } from "@/lib/date-range";

export default function DateRangeControl({
  range,
  precision = "date",
}: {
  range: FleetDateRange;
  precision?: "date" | "datetime";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dateStart, setDateStart] = useState(range.inputStart);
  const [dateEnd, setDateEnd] = useState(range.inputEnd);

  useEffect(() => {
    setDateStart(range.inputStart);
    setDateEnd(range.inputEnd);
  }, [range.inputStart, range.inputEnd]);

  const isDirty = dateStart !== range.inputStart || dateEnd !== range.inputEnd;

  const commit = (nextStart: string, nextEnd: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedStart = nextStart <= nextEnd ? nextStart : nextEnd;
    const normalizedEnd = nextStart <= nextEnd ? nextEnd : nextStart;
    params.set("dateStart", normalizedStart);
    params.set("dateEnd", normalizedEnd);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form
      className="date-range-control"
      onSubmit={(event) => {
        event.preventDefault();
        commit(dateStart, dateEnd);
      }}
      aria-label="Date range"
    >
      <div className="date-range-copy">
        <div className="meta-label">Range</div>
        <div className="meta-value">{range.label}</div>
      </div>
      <label className="date-field">
        <span>Start</span>
        <input
          type={precision === "datetime" ? "datetime-local" : "date"}
          value={dateStart}
          onChange={(event) => setDateStart(event.target.value)}
          aria-label={precision === "datetime" ? "Start date and time" : "Start date"}
        />
      </label>
      <label className="date-field">
        <span>End</span>
        <input
          type={precision === "datetime" ? "datetime-local" : "date"}
          value={dateEnd}
          onChange={(event) => setDateEnd(event.target.value)}
          aria-label={precision === "datetime" ? "End date and time" : "End date"}
        />
      </label>
      <button className={`btn-sm ${isDirty ? "primary" : ""}`} type="submit" disabled={!dateStart || !dateEnd}>
        Apply
      </button>
      <button
        className="btn-sm"
        type="button"
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("dateStart");
          params.delete("dateEnd");
          router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
        }}
      >
        Reset
      </button>
    </form>
  );
}
