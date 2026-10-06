import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";
import { PeriodSelector } from "@/components/PeriodSelector";
import { MonthlySummaryCharts } from "@/components/MonthlySummaryCharts";
import { UploadForm } from "@/components/UploadForm";
import { formatAmountFromMinorUnits } from "@/lib/money";
import type { Currency } from "@prisma/client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const periods = Array.from(
    new Map(
      transactions.map((t) => {
        const year = t.date.getFullYear();
        const month = t.date.getMonth() + 1;
        return [`${year}-${month}`, { periodYear: year, periodMonth: month }];
      }),
    ).values(),
  ).sort((a, b) => b.periodYear - a.periodYear || b.periodMonth - a.periodMonth);

  const now = new Date();
  const selectedYear = Number(params.year) || periods[0]?.periodYear || now.getFullYear();
  const selectedMonth = Number(params.month) || periods[0]?.periodMonth || now.getMonth() + 1;

  const startDate = new Date(selectedYear, selectedMonth - 1, 1);
  const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

  const [categoryRows, currencyRows] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId", "currency"],
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amountMinor: true },
    }),
    prisma.transaction.groupBy({
      by: ["currency"],
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amountMinor: true },
    }),
  ]);

  const categoryIds = [
    ...new Set(
      categoryRows.map((r) => r.categoryId).filter((id): id is string => id !== null),
    ),
  ];
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const categoryBreakdown = categoryRows.map((r) => ({
    category: r.categoryId ? (categoryNameById.get(r.categoryId) ?? "Otros") : "Sin categoría",
    currency: r.currency,
    amountMinor: r._sum.amountMinor ?? 0,
  }));

  const currencyTotals = currencyRows.map((r) => ({
    currency: r.currency,
    amountMinor: r._sum.amountMinor ?? 0,
  }));

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link href="/analysis" className="text-sm underline">
            Analysis
          </Link>
          <Link href="/statements" className="text-sm underline">
            Statements
          </Link>
          <LogoutButton />
        </div>
      </div>

      <PeriodSelector periods={periods} selectedYear={selectedYear} selectedMonth={selectedMonth} />

      <UploadForm />

      {categoryBreakdown.length === 0 ? (
        <p className="text-sm opacity-70">
          No hay transacciones para {selectedMonth}/{selectedYear}.
        </p>
      ) : (
        <>
          <div className="flex gap-4 text-sm">
            {currencyTotals.map((c) => (
              <span key={c.currency} className="font-medium">
                Total {c.currency}: {formatAmountFromMinorUnits(c.amountMinor, c.currency as Currency)}
              </span>
            ))}
          </div>
          <MonthlySummaryCharts data={categoryBreakdown} />
        </>
      )}
    </main>
  );
}
