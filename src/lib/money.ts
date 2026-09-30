import type { Currency } from "@prisma/client";

/**
 * Parsea un monto en texto (formato chileno "15.000" o "1.234,56", o
 * formato US "1,234.56") a unidad mínima entera ("centavos"). CLP siempre
 * resulta múltiplo de 100 ya que no tiene decimales en la práctica.
 */
export function parseAmountToMinorUnits(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === ",") return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;

  if (lastComma > -1 && lastDot > -1) {
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = cleaned.length - lastComma - 1;
    normalized = decimals === 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (lastDot > -1) {
    const decimals = cleaned.length - lastDot - 1;
    normalized = decimals === 2 ? cleaned : cleaned.replace(/\./g, "");
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

export function formatAmountFromMinorUnits(amountMinor: number, currency: Currency): string {
  const value = amountMinor / 100;
  return new Intl.NumberFormat(currency === "CLP" ? "es-CL" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(value);
}
