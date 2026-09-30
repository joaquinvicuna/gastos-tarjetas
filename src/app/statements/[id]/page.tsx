import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionsTable } from "@/components/TransactionsTable";

export default async function StatementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const statement = await prisma.statement.findUnique({
    where: { id },
    include: {
      card: { include: { bank: true } },
      transactions: { include: { category: true }, orderBy: { date: "asc" } },
    },
  });

  if (!statement || statement.userId !== userId) notFound();

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {statement.card.bank.name}
            {statement.card.last4 ? ` •••• ${statement.card.last4}` : ""}
          </h1>
          <p className="text-sm opacity-70">
            {statement.periodMonth}/{statement.periodYear} · {statement.fileName} ·{" "}
            {statement.sourceFormat}
            {statement.parserTier ? ` · ${statement.parserTier}` : ""}
          </p>
        </div>
        <Link href="/statements" className="text-sm underline">
          Volver
        </Link>
      </div>

      {statement.status === "ERROR" ? (
        <p className="text-sm text-red-600">{statement.errorMessage}</p>
      ) : (
        <TransactionsTable
          transactions={statement.transactions.map((t) => ({
            id: t.id,
            date: t.date.toISOString(),
            description: t.description,
            amountMinor: t.amountMinor,
            currency: t.currency,
            categoryId: t.categoryId,
            categorizationSource: t.categorizationSource,
          }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}
    </main>
  );
}
