import { parseAmountToMinorUnits } from "@/lib/money";
import { normalizeText } from "@/lib/text";
import { normalizeYear } from "@/lib/extract/period";
import type { ExtractedTransaction } from "@/lib/extract/types";
import type { HeuristicExtraction } from "@/lib/extract/heuristic/pdfHeuristic";

const HEADER_KEYWORDS: Record<string, string[]> = {
  date: ["FECHA", "DATE"],
  description: ["DESCRIPCION", "DETALLE", "GLOSA", "COMERCIO", "DESCRIPTION"],
  amount: ["MONTO", "VALOR", "AMOUNT", "IMPORTE"],
  cargo: ["CARGO", "DEBITO", "DEBIT"],
  abono: ["ABONO", "CREDITO", "CREDIT", "PAGO"],
  currency: ["MONEDA", "CURRENCY"],
};

function findColumnMatches(
  normalizedRow: string[],
  keywords: string[],
): { cell: string; idx: number }[] {
  return normalizedRow
    .map((cell, idx) => ({ cell, idx }))
    .filter(({ cell }) => keywords.some((kw) => cell.includes(kw)));
}

function pickBestColumn(matches: { cell: string; idx: number }[]): number | undefined {
  if (matches.length === 0) return undefined;
  // Cartolas reales suelen tener más de una columna candidata para un mismo
  // tipo (ej. "Monto Moneda Origen" Y "Monto (USD)"). Preferimos la que
  // menciona explícitamente la moneda que vamos a registrar, y si ninguna
  // lo hace, la última (el monto final/facturado suele venir después del
  // monto en la moneda de origen).
  const currencyMatch = matches.find(({ cell }) => /USD|DOLAR|CLP|PESOS/.test(cell));
  return (currencyMatch ?? matches[matches.length - 1]).idx;
}

function matchHeaderColumns(row: string[]): Record<string, number> | null {
  const normalizedRow = row.map((cell) => normalizeText(cell));

  const amountMatches = findColumnMatches(normalizedRow, HEADER_KEYWORDS.amount);
  const cargoMatches = findColumnMatches(normalizedRow, HEADER_KEYWORDS.cargo);
  const abonoMatches = findColumnMatches(normalizedRow, HEADER_KEYWORDS.abono);

  // Una columna de "monto" a veces incluye la palabra "moneda" en su propio
  // título (ej. "Monto Moneda Origen") sin ser una columna dedicada al
  // código de moneda — excluirla evita leer un número como si fuera "CLP"/
  // "USD" y quedarnos siempre con el default.
  const amountLikeIndices = new Set(
    [...amountMatches, ...cargoMatches, ...abonoMatches].map((m) => m.idx),
  );
  const currencyMatches = findColumnMatches(normalizedRow, HEADER_KEYWORDS.currency).filter(
    (m) => !amountLikeIndices.has(m.idx),
  );

  const columns: Record<string, number> = {};
  const dateIdx = pickBestColumn(findColumnMatches(normalizedRow, HEADER_KEYWORDS.date));
  if (dateIdx !== undefined) columns.date = dateIdx;
  const descIdx = pickBestColumn(findColumnMatches(normalizedRow, HEADER_KEYWORDS.description));
  if (descIdx !== undefined) columns.description = descIdx;
  const amountIdx = pickBestColumn(amountMatches);
  if (amountIdx !== undefined) columns.amount = amountIdx;
  const cargoIdx = pickBestColumn(cargoMatches);
  if (cargoIdx !== undefined) columns.cargo = cargoIdx;
  const abonoIdx = pickBestColumn(abonoMatches);
  if (abonoIdx !== undefined) columns.abono = abonoIdx;
  const currencyIdx = pickBestColumn(currencyMatches);
  if (currencyIdx !== undefined) columns.currency = currencyIdx;

  const hasAmountColumn =
    columns.amount !== undefined || columns.cargo !== undefined || columns.abono !== undefined;
  if (columns.date !== undefined && columns.description !== undefined && hasAmountColumn) {
    return columns;
  }
  return null;
}

function parseFlexibleDate(token: string, fallbackYear: number | null): Date | null {
  if (!token) return null;

  const iso = token.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmy = token.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = dmy[3] ? normalizeYear(Number(dmy[3])) : fallbackYear;
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function parseCurrencyCell(token: string): "CLP" | "USD" {
  const normalized = normalizeText(token);
  return /USD|US\$|DOLAR/.test(normalized) ? "USD" : "CLP";
}

/**
 * Barrido de una sola pasada sobre toda la hoja (no solo las primeras N
 * filas): las cartolas reales suelen traer un bloque de encabezado largo
 * (logo, datos del titular, resumen de facturación) antes de la tabla de
 * transacciones. También soporta múltiples tablas en la misma hoja (ej.
 * "Movimientos Nacionales" en CLP seguido de "Movimientos Internacionales"
 * en USD), re-detectando el encabezado cada vez que vuelve a aparecer y
 * cambiando de moneda según el título de sección.
 */
export function runTableHeuristic(
  rows: string[][],
  fallbackYear: number | null,
): HeuristicExtraction {
  let columns: Record<string, number> | null = null;
  let currentCurrency: "CLP" | "USD" = "CLP";
  const transactions: ExtractedTransaction[] = [];
  let candidateRows = 0;

  for (const row of rows) {
    if (row.every((cell) => cell.trim() === "")) continue;

    const joined = normalizeText(row.join(" "));
    if (/INTERNACIONAL|DOLARES|MONEDA EXTRANJERA/.test(joined)) {
      currentCurrency = "USD";
    } else if (/NACIONAL|PESOS CHILENOS/.test(joined)) {
      currentCurrency = "CLP";
    }

    const headerColumns = matchHeaderColumns(row);
    if (headerColumns) {
      columns = headerColumns;
      continue;
    }

    if (!columns) continue;
    candidateRows++;

    const date = parseFlexibleDate(row[columns.date] ?? "", fallbackYear);
    if (!date) continue;

    const description = (row[columns.description] ?? "").trim();

    let amountMinor: number | null = null;
    if (columns.amount !== undefined) {
      amountMinor = parseAmountToMinorUnits(row[columns.amount] ?? "");
    } else {
      const cargo =
        columns.cargo !== undefined ? parseAmountToMinorUnits(row[columns.cargo] ?? "") : null;
      const abono =
        columns.abono !== undefined ? parseAmountToMinorUnits(row[columns.abono] ?? "") : null;
      if (cargo) amountMinor = cargo;
      else if (abono) amountMinor = -abono;
    }
    if (amountMinor === null || amountMinor === 0) continue;

    const currency =
      columns.currency !== undefined ? parseCurrencyCell(row[columns.currency] ?? "") : currentCurrency;

    transactions.push({ date, description, amountMinor, currency });
  }

  const confidence = candidateRows === 0 ? 0 : transactions.length / candidateRows;
  return { transactions, confidence };
}
