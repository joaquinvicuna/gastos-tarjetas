"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatAmountFromMinorUnits } from "@/lib/money";
import type { Currency } from "@prisma/client";

interface CategoryDatum {
  category: string;
  currency: Currency;
  amountMinor: number;
}

export function MonthlySummaryCharts({ data }: { data: CategoryDatum[] }) {
  const currencies = Array.from(new Set(data.map((d) => d.currency)));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {currencies.map((currency) => {
        const rows = data
          .filter((d) => d.currency === currency)
          .map((d) => ({ category: d.category, amount: d.amountMinor / 100 }))
          .sort((a, b) => b.amount - a.amount);

        return (
          <div key={currency} className="rounded border border-black/10 dark:border-white/15 p-4">
            <h2 className="text-sm font-medium mb-2">Gasto por categoría ({currency})</h2>
            <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 40)}>
              <BarChart data={rows} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v: number) => v.toLocaleString("es-CL")} />
                <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => formatAmountFromMinorUnits(Math.round(Number(value) * 100), currency)}
                />
                <Bar dataKey="amount" fill={currency === "USD" ? "#2563eb" : "#16a34a"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
