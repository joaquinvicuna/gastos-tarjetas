import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processUploadedStatement } from "@/lib/statements/processStatement";

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Debes adjuntar un archivo" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 15MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await processUploadedStatement(session.user.id, {
      name: file.name,
      type: file.type,
      buffer,
    });
    return NextResponse.json(result, { status: result.status === "PARSED" ? 201 : 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo procesar el statement";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const statements = await prisma.statement.findMany({
    where: { userId: session.user.id },
    include: { card: { include: { bank: true } }, _count: { select: { transactions: true } } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { uploadedAt: "desc" }],
  });

  return NextResponse.json(statements);
}
