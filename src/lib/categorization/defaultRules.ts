import type { DefaultCategoryName } from "@/lib/categorization/defaultCategories";

interface Rule {
  category: DefaultCategoryName;
  keywords: string[];
}

// Reglas de partida basadas en comercios comunes en Chile. Se evalúan en
// orden, así que las más específicas (ej. "UBER EATS") van antes que las
// genéricas (ej. "UBER TRIP") para evitar falsos positivos entre categorías.
const DEFAULT_RULES: Rule[] = [
  {
    category: "Alimentación",
    keywords: [
      "UBER EATS",
      "UBER  EATS",
      "RAPPI",
      "PEDIDOSYA",
      "LIDER",
      "JUMBO",
      "SANTA ISABEL",
      "TOTTUS",
      "UNIMARC",
      "SUPERMERCADO",
      "MCDONALD",
      "BURGER",
      "STARBUCKS",
      "JUAN VALDEZ",
      "PANADERIA",
      "SUSHI",
      "PIZZA",
      "RESTAURANT",
      "RESTAURANTE",
    ],
  },
  {
    category: "Transporte",
    keywords: [
      "UBER TRIP",
      "UBER  TRIP",
      "UBER *TRIP",
      "CABIFY",
      "DIDI",
      "COPEC",
      "SHELL",
      "PETROBRAS",
      "BENCINA",
      "METRO",
      "RED MOVILIDAD",
      "ESTACIONAMIENTO",
      "PEAJE",
      "AUTOPISTA",
      "TAG",
    ],
  },
  {
    category: "Entretenimiento",
    keywords: [
      "NETFLIX",
      "SPOTIFY",
      "HBO",
      "DISNEY",
      "CINEMARK",
      "HOYTS",
      "STEAM",
      "PLAYSTATION",
      "XBOX",
      "YOUTUBE PREMIUM",
    ],
  },
  {
    category: "Servicios",
    keywords: [
      "ENEL",
      "CGE",
      "AGUAS ANDINAS",
      "ESVAL",
      "ENTEL",
      "MOVISTAR",
      "WOM",
      "CLARO",
      "VTR",
      "GTD",
      "MUNDO PACIFICO",
    ],
  },
  {
    category: "Salud",
    keywords: [
      "FARMACIA",
      "CRUZ VERDE",
      "SALCOBRAND",
      "AHUMADA",
      "CLINICA",
      "HOSPITAL",
      "ISAPRE",
      "FONASA",
    ],
  },
  {
    category: "Compras",
    keywords: [
      "FALABELLA",
      "PARIS",
      "RIPLEY",
      "AMAZON",
      "MERCADOLIBRE",
      "MERCADO LIBRE",
      "ZARA",
      "H&M",
    ],
  },
  {
    category: "Educación",
    keywords: ["UNIVERSIDAD", "INSTITUTO", "COLEGIO", "DUOC", "LIBRERIA"],
  },
  {
    category: "Viajes",
    keywords: ["LATAM", "SKY AIRLINE", "HOTEL", "BOOKING", "AIRBNB", "DESPEGAR"],
  },
];

export function matchDefaultRule(merchantKey: string): DefaultCategoryName | null {
  for (const rule of DEFAULT_RULES) {
    if (rule.keywords.some((keyword) => merchantKey.includes(keyword))) {
      return rule.category;
    }
  }
  return null;
}
