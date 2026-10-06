import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { detectSourceFormat } from "@/lib/extract/detectFormat";
import { runHeuristicExtraction, extractRawText } from "@/lib/extract/runHeuristicExtraction";
import { runLlmExtraction } from "@/lib/extract/llmExtract";
import { normalizeMerchant } from "@/lib/categorization/normalizeMerchant";
import { categorize } from "@/lib/categorization/categorize";
import type { ExtractionResult } from "@/lib/extract/types";
import type { ParserTier } from "@prisma/client";

const MIN_CONFIDENCE = 0.5;

export interface ProcessStatementResult {
  statementId: string;
  status: "PARSED" | "ERROR";
  errorMessage?: string;
  transactionCount: number;
}

async function createUnknownCardId(userId: string): Promise<string> {
  const bank = await prisma.bank.upsert({
    where: { code: "desconocido" },
    update: {},
    create: { code: "desconocido", name: "Banco sin identificar" },
  });

  const card = await prisma.card.create({
    data: { userId, bankId: bank.id, last4: null, type: "CREDIT", nickname: "Sin identificar" },
  });
  return card.id;
}

// El banco es "nice to have" (permite separar dashboards por banco), pero
// NO debe bloquear el guardado de transacciones reales: muchas cartolas
// (ej. cuando el nombre del banco es un logo/imagen del encabezado de
// impresión, no texto de celda) nunca van a traer el nombre del banco en
// los datos, aunque las transacciones se hayan extraído perfecto.
function isUsableExtraction(extraction: ExtractionResult): boolean {
  return (
    extraction.confidence >= MIN_CONFIDENCE &&
    extraction.transactions.length > 0 &&
    extraction.periodMonth !== null &&
    extraction.periodYear !== null
  );
}

async function isDuplicateTransaction(
  tx: any,
  userId: string,
  date: Date,
  amountMinor: number,
  merchantKey: string,
  currency: string,
): Promise<boolean> {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  const existing = await tx.transaction.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lt: endOfDay,
      },
      amountMinor,
      merchantKey,
      currency: currency as any,
    },
  });
  return !!existing;
}

export async function processUploadedStatement(
  userId: string,
  file: { name: string; type: string; buffer: Buffer },
): Promise<ProcessStatementResult> {
  const sourceFormat = detectSourceFormat(file.name, file.type);
  if (!sourceFormat) {
    throw new Error("Formato de archivo no soportado. Sube un PDF, Excel (.xlsx) o CSV.");
  }

  const { relativePath } = await saveFile(userId, file.name, file.buffer);

  let extraction = await runHeuristicExtraction(file.buffer, sourceFormat);
  let parserTier: ParserTier = "HEURISTIC";

  if (!isUsableExtraction(extraction)) {
    const rawText = await extractRawText(file.buffer, sourceFormat);
    const llmResult = await runLlmExtraction(rawText).catch((err) => {
      console.error("Tier 2 (LLM) extraction failed:", err);
      return null;
    });
    if (llmResult && isUsableExtraction(llmResult)) {
      extraction = llmResult;
      parserTier = "LLM";
    }
  }

  if (!isUsableExtraction(extraction)) {
    const now = new Date();
    const statement = await prisma.statement.create({
      data: {
        userId,
        cardId: await createUnknownCardId(userId),
        periodMonth: extraction.periodMonth ?? now.getMonth() + 1,
        periodYear: extraction.periodYear ?? now.getFullYear(),
        fileName: file.name,
        filePath: relativePath,
        sourceFormat,
        parserTier,
        status: "ERROR",
        errorMessage:
          "No se pudo identificar automáticamente el banco, el periodo o las transacciones (ni con el motor heurístico ni con el respaldo LLM).",
      },
    });
    return {
      statementId: statement.id,
      status: "ERROR",
      errorMessage: statement.errorMessage ?? undefined,
      transactionCount: 0,
    };
  }

  const bankCode = extraction.bankCode ?? "desconocido";
  const bankName = extraction.bankName ?? "Banco sin identificar";
  const bank = await prisma.bank.upsert({
    where: { code: bankCode },
    update: bankCode === "desconocido" ? {} : { name: bankName },
    create: { code: bankCode, name: bankName },
  });

  let card = await prisma.card.findFirst({
    where: { userId, bankId: bank.id, last4: extraction.cardLast4 },
  });
  if (!card) {
    card = await prisma.card.create({
      data: {
        userId,
        bankId: bank.id,
        last4: extraction.cardLast4,
        type: extraction.cardType ?? "CREDIT",
        nickname: extraction.cardLast4 ? `${bank.name} •••• ${extraction.cardLast4}` : bank.name,
      },
    });
  }

  try {
    const statement = await prisma.$transaction(async (tx) => {
      const created = await tx.statement.create({
        data: {
          userId,
          cardId: card.id,
          periodMonth: extraction.periodMonth!,
          periodYear: extraction.periodYear!,
          fileName: file.name,
          filePath: relativePath,
          sourceFormat,
          parserTier,
          status: "PARSED",
        },
      });

      const transactionsData = [];
      for (const t of extraction.transactions) {
        const merchantKey = normalizeMerchant(t.description);
        const isDuplicate = await isDuplicateTransaction(
          tx,
          userId,
          t.date,
          t.amountMinor,
          merchantKey,
          t.currency,
        );
        if (!isDuplicate) {
          const { categoryId, source } = await categorize(tx, userId, merchantKey);
          transactionsData.push({
            statementId: created.id,
            userId,
            date: t.date,
            description: t.description,
            merchantKey,
            amountMinor: t.amountMinor,
            currency: t.currency,
            categoryId,
            categorizationSource: source,
          });
        }
      }

      await tx.transaction.createMany({ data: transactionsData });

      return { ...created, insertedTransactionCount: transactionsData.length };
    });

    return {
      statementId: statement.id,
      status: "PARSED",
      transactionCount: (statement as any).insertedTransactionCount ?? 0,
    };
  } catch (err) {
    throw err;
  }
}
