import * as XLSX from "xlsx";

export function extractExcelRows(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const rows: string[][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    for (const row of sheetRows) {
      rows.push(row.map((cell) => String(cell ?? "").trim()));
    }
  }

  return rows;
}
