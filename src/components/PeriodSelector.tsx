"use client";

import { useRouter } from "next/navigation";

interface Period {
  periodYear: number;
  periodMonth: number;
}

export function PeriodSelector({
  periods,
  selectedYear,
  selectedMonth,
}: {
  periods: Period[];
  selectedYear: number;
  selectedMonth: number;
}) {
  const router = useRouter();

  if (periods.length === 0) return null;

  return (
    <select
      value={`${selectedYear}-${selectedMonth}`}
      onChange={(e) => {
        const [year, month] = e.target.value.split("-");
        router.push(`/dashboard?year=${year}&month=${month}`);
      }}
      className="border border-black/15 dark:border-white/20 bg-transparent rounded px-2 py-1 text-sm"
    >
      {periods.map((p) => (
        <option key={`${p.periodYear}-${p.periodMonth}`} value={`${p.periodYear}-${p.periodMonth}`}>
          {p.periodMonth}/{p.periodYear}
        </option>
      ))}
    </select>
  );
}
