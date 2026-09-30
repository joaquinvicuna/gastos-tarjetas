import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UploadForm } from "@/components/UploadForm";

export default async function StatementsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const statements = await prisma.statement.findMany({
    where: { userId },
    include: { card: { include: { bank: true } }, _count: { select: { transactions: true } } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { uploadedAt: "desc" }],
  });

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Statements</h1>
        <Link href="/dashboard" className="text-sm underline">
          Dashboard
        </Link>
      </div>

      <UploadForm />

      <div className="space-y-2">
        {statements.length === 0 && (
          <p className="text-sm opacity-70">Aún no subes statements.</p>
        )}
        {statements.map((s) => (
          <Link
            key={s.id}
            href={`/statements/${s.id}`}
            className="block rounded border border-black/10 dark:border-white/15 p-3 text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            <div className="flex justify-between">
              <span className="font-medium">
                {s.card.bank.name}
                {s.card.last4 ? ` •••• ${s.card.last4}` : ""}
              </span>
              <span className={s.status === "ERROR" ? "text-red-600" : "text-green-600"}>
                {s.status}
              </span>
            </div>
            <div className="opacity-70">
              {s.periodMonth}/{s.periodYear} · {s._count.transactions} transacciones ·{" "}
              {s.fileName}
            </div>
            {s.errorMessage && <div className="text-red-600 mt-1">{s.errorMessage}</div>}
          </Link>
        ))}
      </div>
    </main>
  );
}
