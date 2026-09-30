import type { SourceFormat } from "@prisma/client";

export function detectSourceFormat(fileName: string, mimeType: string): SourceFormat | null {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";

  if (ext === "pdf" || mimeType === "application/pdf") return "PDF";
  if (
    ext === "xlsx" ||
    ext === "xls" ||
    mimeType.includes("spreadsheetml") ||
    mimeType === "application/vnd.ms-excel"
  ) {
    return "XLSX";
  }
  if (ext === "csv" || mimeType === "text/csv") return "CSV";

  return null;
}
