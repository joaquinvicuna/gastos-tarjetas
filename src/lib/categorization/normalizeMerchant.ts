import { normalizeText } from "@/lib/text";

const BOILERPLATE_WORDS = /\b(COMPRA|NAC|NACIONAL|INTERNACIONAL|PAGO|TRANSFERENCIA)\b/g;
const LONG_DIGIT_SEQUENCES = /\b\d{4,}\b/g;

export function normalizeMerchant(description: string): string {
  const base = normalizeText(description);
  const cleaned = base
    .replace(LONG_DIGIT_SEQUENCES, "")
    .replace(BOILERPLATE_WORDS, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || base;
}
