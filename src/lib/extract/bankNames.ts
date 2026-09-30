import { normalizeText } from "@/lib/text";

interface KnownBank {
  code: string;
  name: string;
  aliases: string[];
}

// Lista de partida para acelerar la detección (Tier 1). No es exhaustiva:
// un banco no listado aquí simplemente no se detecta en este tier y el
// statement queda pendiente del respaldo Tier 2 (LLM).
const KNOWN_BANKS: KnownBank[] = [
  { code: "banco_de_chile", name: "Banco de Chile", aliases: ["banco de chile", "banchile"] },
  {
    code: "banco_estado",
    name: "BancoEstado",
    aliases: ["bancoestado", "banco estado", "banco del estado"],
  },
  { code: "santander", name: "Santander", aliases: ["santander"] },
  {
    code: "bci",
    name: "BCI",
    aliases: ["bci", "banco de credito e inversiones", "banco credito e inversiones"],
  },
  { code: "scotiabank", name: "Scotiabank", aliases: ["scotiabank"] },
  { code: "itau", name: "Itaú", aliases: ["itau"] },
  { code: "falabella", name: "Banco Falabella", aliases: ["banco falabella", "cmr falabella"] },
  { code: "ripley", name: "Banco Ripley", aliases: ["banco ripley"] },
  { code: "security", name: "Banco Security", aliases: ["banco security"] },
  { code: "bice", name: "Banco BICE", aliases: ["banco bice"] },
  { code: "consorcio", name: "Banco Consorcio", aliases: ["banco consorcio"] },
];

export function detectBank(rawText: string): { code: string; name: string } | null {
  const normalized = normalizeText(rawText);
  for (const bank of KNOWN_BANKS) {
    for (const alias of bank.aliases) {
      if (normalized.includes(normalizeText(alias))) {
        return { code: bank.code, name: bank.name };
      }
    }
  }
  return null;
}

export function slugifyBankName(name: string): string {
  return normalizeText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
