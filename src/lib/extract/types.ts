import type { Currency, SourceFormat } from "@prisma/client";

export interface ExtractedTransaction {
  date: Date;
  description: string;
  amountMinor: number;
  currency: Currency;
}

export interface ExtractionResult {
  bankName: string | null;
  bankCode: string | null;
  cardLast4: string | null;
  cardType: "CREDIT" | "DEBIT" | null;
  periodMonth: number | null;
  periodYear: number | null;
  transactions: ExtractedTransaction[];
  /** 0..1 — qué tan confiable es el resultado heurístico. */
  confidence: number;
}

export type { SourceFormat };
