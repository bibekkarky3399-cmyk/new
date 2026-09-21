// Fields can contain customer-supplied text (e.g. an order's customer name).
// Prefixing a leading =, +, -, @, tab, or CR with an apostrophe stops
// spreadsheet apps from interpreting it as a formula when the export is
// opened in Excel/Sheets/LibreOffice (CSV/formula injection, CWE-1236).
function neutralizeFormula(str: string): string {
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
}

function escapeCsvField(value: string | number): string {
  const str = neutralizeFormula(String(value));
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvField).join(",")
  );
  return lines.join("\r\n") + "\r\n";
}
