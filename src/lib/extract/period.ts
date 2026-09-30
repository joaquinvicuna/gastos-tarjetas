import { normalizeText } from "@/lib/text";

const SPANISH_MONTHS: Record<string, number> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  SETIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};

/**
 * Intenta determinar a qué mes/año corresponde el statement leyendo el
 * propio texto (encabezado tipo "Estado de cuenta Agosto 2024" o
 * "Periodo: 01/08/2024 al 31/08/2024"). Si no encuentra nada explícito,
 * el llamador debe caer a un fallback (ej. fecha de la última transacción).
 */
export function detectPeriod(rawText: string): { month: number; year: number } | null {
  const normalized = normalizeText(rawText);

  const monthYearWords = normalized.match(
    /(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+(?:DE\s+)?(\d{4})/,
  );
  if (monthYearWords) {
    const month = SPANISH_MONTHS[monthYearWords[1]];
    const year = Number(monthYearWords[2]);
    if (month && year) return { month, year };
  }

  const rangeMatch = normalized.match(
    /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s*(?:AL|A|-|HASTA)\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/,
  );
  if (rangeMatch) {
    const month = Number(rangeMatch[5]);
    const year = normalizeYear(Number(rangeMatch[6]));
    if (month >= 1 && month <= 12) return { month, year };
  }

  const mmYyyy = normalized.match(/\b(\d{1,2})[/-](\d{4})\b/);
  if (mmYyyy) {
    const month = Number(mmYyyy[1]);
    const year = Number(mmYyyy[2]);
    if (month >= 1 && month <= 12) return { month, year };
  }

  return null;
}

export function normalizeYear(year: number): number {
  if (year >= 100) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}
