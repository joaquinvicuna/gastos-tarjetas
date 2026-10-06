"use client";

import { useRouter } from "next/navigation";

interface Period {
  periodYear: number;
  periodMonth: number;
}

export function AnalysisPeriodSelector({
  periods,
  selectedYear,
  selectedMonth,
  paramName,
}: {
  periods: Period[];
  selectedYear: number;
  selectedMonth: number;
  paramName: "1" | "2";
}) {
  const router = useRouter();

  if (periods.length === 0) return null;

  return (
    <select
      value={`${selectedYear}-${selectedMonth}`}
      onChange={(e) => {
        const [year, month] = e.target.value.split("-");
        const params = new URLSearchParams(window.location.search);
        params.set(`year${paramName}`, year);
        params.set(`month${paramName}`, month);
        router.push(`/analysis?${params.toString()}`);
      }}
      className="border border-black/15 dark:border-white/20 bg-transparent rounded px-2 py-1 text-sm w-full"
    >
      {periods.map((p) => (
        <option key={`${p.periodYear}-${p.periodMonth}`} value={`${p.periodYear}-${p.periodMonth}`}>
          {p.periodMonth}/{p.periodYear}
        </option>
      ))}
    </select>
  );
}
