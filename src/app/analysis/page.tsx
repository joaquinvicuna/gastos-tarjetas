import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";
import { DualPeriodComparison } from "@/components/DualPeriodComparison";
import { AnalysisPeriodSelector } from "@/components/AnalysisPeriodSelector";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ year1?: string; month1?: string; year2?: string; month2?: string }>;
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
  const selectedYear1 = Number(params.year1) || periods[1]?.periodYear || now.getFullYear();
  const selectedMonth1 = Number(params.month1) || periods[1]?.periodMonth || now.getMonth();
  const selectedYear2 = Number(params.year2) || periods[0]?.periodYear || now.getFullYear();
  const selectedMonth2 = Number(params.month2) || periods[0]?.periodMonth || now.getMonth() + 1;

  const startDate1 = new Date(selectedYear1, selectedMonth1 - 1, 1);
  const endDate1 = new Date(selectedYear1, selectedMonth1, 0, 23, 59, 59);

  const startDate2 = new Date(selectedYear2, selectedMonth2 - 1, 1);
  const endDate2 = new Date(selectedYear2, selectedMonth2, 0, 23, 59, 59);

  const [categoryRows1, categoryRows2] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId", "currency"],
      where: {
        userId,
        date: { gte: startDate1, lte: endDate1 },
      },
      _sum: { amountMinor: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId", "currency"],
      where: {
        userId,
        date: { gte: startDate2, lte: endDate2 },
      },
      _sum: { amountMinor: true },
    }),
  ]);

  const categoryIds1 = [
    ...new Set(
      categoryRows1.map((r) => r.categoryId).filter((id): id is string => id !== null),
    ),
  ];
  const categoryIds2 = [
    ...new Set(
      categoryRows2.map((r) => r.categoryId).filter((id): id is string => id !== null),
    ),
  ];
  const allCategoryIds = [...new Set([...categoryIds1, ...categoryIds2])];

  const categories = await prisma.category.findMany({ where: { id: { in: allCategoryIds } } });
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const categoryBreakdown1 = categoryRows1.map((r) => ({
    category: r.categoryId ? (categoryNameById.get(r.categoryId) ?? "Otros") : "Sin categoría",
    currency: r.currency,
    amountMinor: r._sum.amountMinor ?? 0,
  }));

  const categoryBreakdown2 = categoryRows2.map((r) => ({
    category: r.categoryId ? (categoryNameById.get(r.categoryId) ?? "Otros") : "Sin categoría",
    currency: r.currency,
    amountMinor: r._sum.amountMinor ?? 0,
  }));

  const period1Label = `${selectedMonth1}/${selectedYear1}`;
  const period2Label = `${selectedMonth2}/${selectedYear2}`;

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Comparative Analysis</h1>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm underline">
            Dashboard
          </Link>
          <Link href="/statements" className="text-sm underline">
            Statements
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Period 1</h2>
          <AnalysisPeriodSelector
            periods={periods}
            selectedYear={selectedYear1}
            selectedMonth={selectedMonth1}
            paramName="1"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Period 2</h2>
          <AnalysisPeriodSelector
            periods={periods}
            selectedYear={selectedYear2}
            selectedMonth={selectedMonth2}
            paramName="2"
          />
        </div>
      </div>

      {categoryBreakdown1.length === 0 && categoryBreakdown2.length === 0 ? (
        <p className="text-sm opacity-70">No transactions available for the selected periods.</p>
      ) : (
        <DualPeriodComparison
          period1Data={categoryBreakdown1}
          period2Data={categoryBreakdown2}
          period1Label={period1Label}
          period2Label={period2Label}
          currencyTotals1={[]}
          currencyTotals2={[]}
        />
      )}
    </main>
  );
}
