import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { slugifyBankName } from "@/lib/extract/bankNames";
import type { ExtractionResult } from "@/lib/extract/types";

const LlmExtractionSchema = z.object({
  bankName: z.string().nullable(),
  cardLast4: z.string().nullable(),
  cardType: z.enum(["CREDIT", "DEBIT"]).nullable(),
  periodMonth: z.number().int().min(1).max(12).nullable(),
  periodYear: z.number().int().nullable(),
  transactions: z.array(
    z.object({
      date: z.string(),
      description: z.string(),
      amountMinor: z.number().int(),
      currency: z.enum(["CLP", "USD"]),
    }),
  ),
});

// Statements muy largos se truncan para mantener costo/latencia acotados; la
// mayoría de las cartolas mensuales entran cómodas en este límite.
const MAX_INPUT_CHARS = 20000;

const SYSTEM_PROMPT = `Eres un extractor de datos de cartolas/statements bancarios de cualquier banco y cualquier formato (el texto puede venir de un PDF o de una tabla Excel/CSV aplanada a texto).

Lee el texto y extrae:
- El nombre del banco (tal como aparece en el documento).
- Los últimos 4 dígitos de la tarjeta, si aparecen.
- El tipo de tarjeta (CREDIT o DEBIT) si se puede determinar.
- El mes y año del periodo del statement.
- Todas las transacciones: fecha, descripción, monto y moneda.

Reglas para "amountMinor": es el monto tal como aparece en el texto multiplicado por 100 (unidad mínima, "centavos"), sin importar la moneda. Ejemplos: "$15.000" (CLP) -> 1500000. "USD 12,99" -> 1299. "8.500" (CLP) -> 850000.

"currency" es "CLP" o "USD" según corresponda a cada transacción individual (una cartola puede mezclar ambas).

"date" en formato ISO YYYY-MM-DD.

Si no puedes determinar bankName, cardLast4, cardType, periodMonth o periodYear, usa null. Si no encuentras transacciones, usa un arreglo vacío. No inventes transacciones, montos ni fechas que no aparezcan explícitamente en el texto.`;

export async function runLlmExtraction(rawText: string): Promise<ExtractionResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const truncated = rawText.slice(0, MAX_INPUT_CHARS);

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: truncated }],
    output_config: { format: zodOutputFormat(LlmExtractionSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) return null;

  return {
    bankName: parsed.bankName,
    bankCode: parsed.bankName ? slugifyBankName(parsed.bankName) : null,
    cardLast4: parsed.cardLast4,
    cardType: parsed.cardType,
    periodMonth: parsed.periodMonth,
    periodYear: parsed.periodYear,
    transactions: parsed.transactions.map((t) => ({
      date: new Date(t.date),
      description: t.description,
      amountMinor: t.amountMinor,
      currency: t.currency,
    })),
    confidence: parsed.transactions.length > 0 ? 1 : 0,
  };
}
