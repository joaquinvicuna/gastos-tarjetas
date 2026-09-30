import { parseAmountToMinorUnits } from "@/lib/money";
import { normalizeText } from "@/lib/text";
import { normalizeYear } from "@/lib/extract/period";
import type { ExtractedTransaction } from "@/lib/extract/types";

const LINE_RE =
  /^(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+(.+?)\s+(US\$|USD|U\$S|\$)?\s*(-?[\d.,]+)\s*$/i;
const DATE_LEAD_RE = /^\d{1,2}[/-]\d{1,2}/;
const USD_MARKER_RE = /^(US\$|USD|U\$S)$/i;

function parseDate(token: string, fallbackYear: number | null): Date | null {
  const parts = token.split(/[/-]/).map((p) => p.trim());
  if (parts.length < 2) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = parts[2] ? normalizeYear(Number(parts[2])) : fallbackYear;

  if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface HeuristicExtraction {
  transactions: ExtractedTransaction[];
  confidence: number;
}

export function runPdfHeuristic(rawText: string, fallbackYear: number | null): HeuristicExtraction {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentCurrency: "CLP" | "USD" = "CLP";
  const transactions: ExtractedTransaction[] = [];
  let candidateLines = 0;

  for (const line of lines) {
    const normalized = normalizeText(line);

    if (/INTERNACIONAL|DOLARES|MONEDA EXTRANJERA/.test(normalized)) {
      currentCurrency = "USD";
      continue;
    }
    if (/NACIONAL|PESOS CHILENOS/.test(normalized)) {
      currentCurrency = "CLP";
      continue;
    }

    if (!DATE_LEAD_RE.test(line)) continue;
    candidateLines += 1;

    const match = line.match(LINE_RE);
    if (!match) continue;

    const [, dateToken, description, marker, amountRaw] = match;
    const date = parseDate(dateToken, fallbackYear);
    const amountMinor = parseAmountToMinorUnits(amountRaw);
    if (!date || amountMinor === null || amountMinor === 0) continue;

    const currency = marker && USD_MARKER_RE.test(marker) ? "USD" : currentCurrency;

    transactions.push({ date, description: description.trim(), amountMinor, currency });
  }

  const confidence = candidateLines === 0 ? 0 : transactions.length / candidateLines;
  return { transactions, confidence };
}
