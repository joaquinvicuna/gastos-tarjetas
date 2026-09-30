import { parse } from "csv-parse/sync";

export function extractCsvRows(buffer: Buffer): string[][] {
  const text = buffer.toString("utf-8");

  const delimiter = (text.match(/;/g)?.length ?? 0) > (text.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = parse(text, {
    delimiter,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });

  return rows;
}
