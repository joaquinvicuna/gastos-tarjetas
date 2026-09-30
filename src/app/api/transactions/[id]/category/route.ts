import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  categoryId: z.string().min(1),
  applyToPast: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
  }

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category || (category.userId !== null && category.userId !== session.user.id)) {
    return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: { categoryId: category.id, categorizationSource: "MANUAL" },
  });

  await prisma.merchantCategoryRule.upsert({
    where: {
      userId_merchantKey: { userId: session.user.id, merchantKey: transaction.merchantKey },
    },
    update: { categoryId: category.id },
    create: {
      userId: session.user.id,
      merchantKey: transaction.merchantKey,
      categoryId: category.id,
    },
  });

  if (parsed.data.applyToPast) {
    await prisma.transaction.updateMany({
      where: { userId: session.user.id, merchantKey: transaction.merchantKey, id: { not: id } },
      data: { categoryId: category.id, categorizationSource: "USER_RULE" },
    });
  }

  return NextResponse.json(updated);
}
