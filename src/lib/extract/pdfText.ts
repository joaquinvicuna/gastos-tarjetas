export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Import perezoso: pdf-parse/pdfjs-dist inicializa polyfills pesados
  // (canvas/DOMMatrix) apenas se importa el módulo. Cargarlo solo aquí evita
  // que un problema con esa dependencia afecte subidas de Excel/CSV, que
  // nunca deberían necesitarlo.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
