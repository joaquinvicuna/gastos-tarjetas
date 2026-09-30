export const DEFAULT_CATEGORIES = [
  "Alimentación",
  "Transporte",
  "Entretenimiento",
  "Servicios",
  "Salud",
  "Compras",
  "Educación",
  "Viajes",
  "Otros",
] as const;

export type DefaultCategoryName = (typeof DEFAULT_CATEGORIES)[number];
