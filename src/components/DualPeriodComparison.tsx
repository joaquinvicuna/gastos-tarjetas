"use client";

import { formatAmountFromMinorUnits } from "@/lib/money";
import type { Currency } from "@prisma/client";

interface CategoryDatum {
  category: string;
  currency: Currency;
  amountMinor: number;
}

interface CurrencyTotal {
  currency: Currency;
  amountMinor: number;
}

interface DualPeriodComparisonProps {
  period1Data: CategoryDatum[];
  period2Data: CategoryDatum[];
  period1Label: string;
  period2Label: string;
  currencyTotals1: CurrencyTotal[];
  currencyTotals2: CurrencyTotal[];
}

export function DualPeriodComparison({
  period1Data,
  period2Data,
  period1Label,
  period2Label,
  currencyTotals1,
  currencyTotals2,
}: DualPeriodComparisonProps) {
  const createTotalMap = (data: CategoryDatum[]) => {
    const map = new Map<Currency, number>();
    for (const item of data) {
      const current = map.get(item.currency) || 0;
      map.set(item.currency, current + item.amountMinor);
    }
    return map;
  };

  const totals1 = createTotalMap(period1Data);
  const totals2 = createTotalMap(period2Data);

  const getAllCurrencies = () => {
    return Array.from(new Set([...totals1.keys(), ...totals2.keys()]));
  };

  const calculateVariation = (amount1: number, amount2: number) => {
    if (amount1 === 0) return amount2 > 0 ? 100 : 0;
    return Math.round(((amount2 - amount1) / amount1) * 100);
  };

  const getVariationColor = (variation: number) => {
    if (variation > 0) return "text-red-600 dark:text-red-400";
    if (variation < 0) return "text-green-600 dark:text-green-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getVariationIndicator = (variation: number) => {
    if (variation > 0) return "↑";
    if (variation < 0) return "↓";
    return "→";
  };

  const allCurrencies = getAllCurrencies();

  const period1Categories = new Map(
    period1Data.map((d) => [d.category, { ...d }]),
  );
  const period2Categories = new Map(
    period2Data.map((d) => [d.category, { ...d }]),
  );

  const allCategories = Array.from(
    new Set([...period1Categories.keys(), ...period2Categories.keys()]),
  ).sort();

  return (
    <div className="space-y-8">
      {/* Totales por Moneda */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Total Comparison by Currency</h2>
        <div className="grid gap-4">
          {allCurrencies.map((currency) => {
            const amount1 = totals1.get(currency) || 0;
            const amount2 = totals2.get(currency) || 0;
            const variation = calculateVariation(amount1, amount2);

            return (
              <div
                key={currency}
                className="rounded border border-black/10 dark:border-white/15 p-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{currency}</span>
                  <span className={`text-xs font-medium ${getVariationColor(variation)}`}>
                    {getVariationIndicator(variation)} {Math.abs(variation)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs opacity-70">{period1Label}</p>
                    <p className="font-medium">
                      {formatAmountFromMinorUnits(amount1, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70">{period2Label}</p>
                    <p className="font-medium">
                      {formatAmountFromMinorUnits(amount2, currency)}
                    </p>
                  </div>
                </div>

                <div className="text-xs opacity-70">
                  Change: {formatAmountFromMinorUnits(amount2 - amount1, currency)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Categorías Comparadas */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Spending by Category</h2>
        <div className="rounded border border-black/10 dark:border-white/15 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/15">
              <tr>
                <th className="p-3 text-left font-medium">Category</th>
                <th className="p-3 text-left font-medium">{period1Label}</th>
                <th className="p-3 text-left font-medium">{period2Label}</th>
                <th className="p-3 text-left font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {allCategories.map((category) => {
                const period1Item = period1Categories.get(category);
                const period2Item = period2Categories.get(category);

                const currency = period1Item?.currency || period2Item?.currency;
                const amount1 = period1Item?.amountMinor || 0;
                const amount2 = period2Item?.amountMinor || 0;

                if (!currency) return null;

                const variation = calculateVariation(amount1, amount2);

                return (
                  <tr key={category} className="border-b border-black/5 dark:border-white/5">
                    <td className="p-3 font-medium">{category}</td>
                    <td className="p-3">{formatAmountFromMinorUnits(amount1, currency)}</td>
                    <td className="p-3">{formatAmountFromMinorUnits(amount2, currency)}</td>
                    <td className={`p-3 font-medium ${getVariationColor(variation)}`}>
                      {getVariationIndicator(variation)} {Math.abs(variation)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen de Cambios */}
      <div className="rounded border border-black/10 dark:border-white/15 p-4 space-y-3 bg-black/2 dark:bg-white/2">
        <h3 className="text-sm font-medium">Summary</h3>
        <ul className="text-sm space-y-1 opacity-80">
          <li>
            • Total categories tracked:{" "}
            <span className="font-medium">{allCategories.length}</span>
          </li>
          <li>
            • Currencies compared: <span className="font-medium">{allCurrencies.join(", ")}</span>
          </li>
          <li>
            • Period 1 label: <span className="font-medium">{period1Label}</span>
          </li>
          <li>
            • Period 2 label: <span className="font-medium">{period2Label}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
