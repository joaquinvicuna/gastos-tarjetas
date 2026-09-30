import type { SourceFormat } from "@prisma/client";
import { extractPdfText } from "@/lib/extract/pdfText";
import { extractExcelRows } from "@/lib/extract/excelRows";
import { extractCsvRows } from "@/lib/extract/csvRows";
import { detectBank } from "@/lib/extract/bankNames";
import { detectPeriod } from "@/lib/extract/period";
import { normalizeText } from "@/lib/text";
import { runPdfHeuristic } from "@/lib/extract/heuristic/pdfHeuristic";
import { runTableHeuristic } from "@/lib/extract/heuristic/tableHeuristic";
import type { ExtractedTransaction, ExtractionResult } from "@/lib/extract/types";

function detectCardLast4(rawText: string): string | null {
  const match = rawText.match(/(?:\*{2,}|[Xx]{2,}|TERMINADA EN)\s*(\d{4})\b/);
  return match ? match[1] : null;
}

function detectCardType(rawText: string): "CREDIT" | "DEBIT" | null {
  const normalized = normalizeText(rawText);
  if (/TARJETA DE DEBITO|CUENTA DEBITO|DEBIT CARD/.test(normalized)) return "DEBIT";
  if (/TARJETA DE CREDITO|CREDIT CARD|LINEA DE CREDITO/.test(normalized)) return "CREDIT";
  return null;
}

function fallbackPeriodFromTransactions(
  transactions: ExtractedTransaction[],
): { month: number; year: number } | null {
  if (transactions.length === 0) return null;

  const counts = new Map<string, { month: number; year: number; count: number }>();
  for (const t of transactions) {
    const month = t.date.getUTCMonth() + 1;
    const year = t.date.getUTCFullYear();
    const key = `${year}-${month}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { month, year, count: 1 });
  }

  let best: { month: number; year: number; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best;
}

export async function extractRawText(buffer: Buffer, sourceFormat: SourceFormat): Promise<string> {
  return sourceFormat === "PDF"
    ? await extractPdfText(buffer)
    : (sourceFormat === "XLSX" ? extractExcelRows(buffer) : extractCsvRows(buffer))
        .map((row) => row.join(" "))
        .join("\n");
}

export async function runHeuristicExtraction(
  buffer: Buffer,
  sourceFormat: SourceFormat,
): Promise<ExtractionResult> {
  const rawText = await extractRawText(buffer, sourceFormat);

  const detectedPeriod = detectPeriod(rawText);
  const bank = detectBank(rawText);
  const cardLast4 = detectCardLast4(rawText);
  const cardType = detectCardType(rawText);

  const heuristic =
    sourceFormat === "PDF"
      ? runPdfHeuristic(rawText, detectedPeriod?.year ?? null)
      : runTableHeuristic(
          sourceFormat === "XLSX" ? extractExcelRows(buffer) : extractCsvRows(buffer),
          detectedPeriod?.year ?? null,
        );

  const fallbackPeriod = fallbackPeriodFromTransactions(heuristic.transactions);

  return {
    bankName: bank?.name ?? null,
    bankCode: bank?.code ?? null,
    cardLast4,
    cardType,
    periodMonth: detectedPeriod?.month ?? fallbackPeriod?.month ?? null,
    periodYear: detectedPeriod?.year ?? fallbackPeriod?.year ?? null,
    transactions: heuristic.transactions,
    confidence: heuristic.confidence,
  };
}
