"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatAmountFromMinorUnits } from "@/lib/money";
import type { Currency } from "@prisma/client";

interface TransactionRow {
  id: string;
  date: string;
  description: string;
  amountMinor: number;
  currency: Currency;
  categoryId: string | null;
  categorizationSource: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

export function TransactionsTable({
  transactions,
  categories,
}: {
  transactions: TransactionRow[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCategoryChange(transactionId: string, categoryId: string) {
    setPendingId(transactionId);
    await fetch(`/api/transactions/${transactionId}/category`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    setPendingId(null);
    router.refresh();
  }

  const totalsByCurrency = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.currency] = (acc[t.currency] ?? 0) + t.amountMinor;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm">
        {Object.entries(totalsByCurrency).map(([currency, amountMinor]) => (
          <span key={currency} className="font-medium">
            Total {currency}: {formatAmountFromMinorUnits(amountMinor, currency as Currency)}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Descripción</th>
              <th className="text-left p-2">Categoría</th>
              <th className="text-right p-2">Monto</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-black/10 dark:border-white/10">
                <td className="p-2 whitespace-nowrap">
                  {new Date(t.date).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </td>
                <td className="p-2">{t.description}</td>
                <td className="p-2">
                  <select
                    value={t.categoryId ?? ""}
                    disabled={pendingId === t.id}
                    onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                    className="bg-transparent border border-black/15 dark:border-white/20 rounded px-1 py-0.5 text-sm disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Sin categoría
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td
                  className={`p-2 text-right whitespace-nowrap ${
                    t.currency === "USD" ? "text-blue-600 dark:text-blue-400" : ""
                  }`}
                >
                  {formatAmountFromMinorUnits(t.amountMinor, t.currency)}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center opacity-70">
                  Sin transacciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
