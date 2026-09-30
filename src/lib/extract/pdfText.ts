// pdfjs-dist referencia DOMMatrix incluso para extracción de solo texto
// (sin renderizar nada), y su fallback vía @napi-rs/canvas no carga en el
// runtime serverless de Vercel (le faltan librerías gráficas del sistema
// que ese entorno no tiene). Como no necesitamos renderizar páginas, basta
// con que el símbolo exista — un stub sin operaciones reales es suficiente.
function ensureDomMatrixPolyfill(): void {
  const g = globalThis as { DOMMatrix?: unknown };
  if (typeof g.DOMMatrix !== "undefined") return;

  class DOMMatrixPolyfill {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    constructor(_init?: string | number[]) {}
  }

  g.DOMMatrix = DOMMatrixPolyfill;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  ensureDomMatrixPolyfill();

  // Import perezoso: pdf-parse/pdfjs-dist inicializa polyfills pesados
  // apenas se importa el módulo. Cargarlo solo aquí evita que un problema
  // con esa dependencia afecte subidas de Excel/CSV, que nunca deberían
  // necesitarla.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
