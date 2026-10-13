"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAmountFromMinorUnits } from "@/lib/money";
import type { Currency } from "@prisma/client";

interface CategoryDatum {
  category: string;
  currency: Currency;
  amountMinor: number;
}

type ChartType = "bar" | "pie" | "donut";

const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"];

export function MonthlySummaryCharts({ data }: { data: CategoryDatum[] }) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const currencies = Array.from(new Set(data.map((d) => d.currency)));

  const getColor = (index: number) => COLORS[index % COLORS.length];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["bar", "pie", "donut"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              chartType === type
                ? "bg-foreground text-background"
                : "border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            {type === "bar" ? "Bars" : type === "pie" ? "Pie" : "Donut"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {currencies.map((currency) => {
          const currencyData = data.filter((d) => d.currency === currency);
          const total = currencyData.reduce((sum, d) => sum + d.amountMinor, 0);

          const rows = currencyData
            .map((d) => ({
              category: d.category,
              amount: d.amountMinor / 100,
              amountMinor: d.amountMinor,
              percentage: Math.round((d.amountMinor / total) * 100),
            }))
            .sort((a, b) => b.amountMinor - a.amountMinor);

          return (
            <div key={currency} className="rounded border border-black/10 dark:border-white/15 p-4">
              <h2 className="text-sm font-medium mb-4">Spending by Category ({currency})</h2>

              {chartType === "bar" ? (
                <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 40)}>
                  <BarChart data={rows} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v: number) => v.toLocaleString("en-US")} />
                    <YAxis type="category" dataKey="category" width={75} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => formatAmountFromMinorUnits(Math.round((value as number) * 100), currency)}
                      labelFormatter={(label) => label}
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--foreground)",
                        borderRadius: "4px",
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                      {rows.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColor(index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={rows}
                      cx="50%"
                      cy="50%"
                      innerRadius={chartType === "donut" ? 60 : 0}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amount"
                      label={(entry: any) =>
                        `${entry.category}: ${entry.percentage}%`
                      }
                    >
                      {rows.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColor(index)} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatAmountFromMinorUnits(Math.round((value as number) * 100), currency)}
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--foreground)",
                        borderRadius: "4px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => {
                        const data = entry.payload as any;
                        return `${data.category}: ${data.percentage}%`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {chartType !== "bar" && (
                <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/15 space-y-1 text-xs">
                  {rows.map((row, index) => (
                    <div key={row.category} className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: getColor(index) }}></span>
                        {row.category}
                      </span>
                      <span className="font-medium">{row.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
