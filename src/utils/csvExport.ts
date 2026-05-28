/**
 * Generic, dependency-free CSV serialization + download.
 *
 * The unit of configuration is a column descriptor array: each `CsvColumn`
 * carries its header text and a `value` accessor. The same `serializeCsv`
 * engine drives every export — add/remove a column by editing the descriptor
 * array, hide one for a particular export with `include: false`. No CSV
 * library is needed for the small, well-formed tables this produces.
 */

export interface CsvColumn<T> {
  /** Stable identifier — not emitted; handy for tests and toggling. */
  key: string;
  /** Header cell text, including units (e.g. "NPV (EUR)"). */
  header: string;
  /** Cell value for a row. `null`/`undefined` render as an empty cell. */
  value: (row: T) => string | number | null | undefined;
  /** Set `false` to omit this column from the output. Defaults to included. */
  include?: boolean;
}

/**
 * Escape a single cell per RFC 4180: empty for nullish, plain string for
 * numbers, and double-quote wrapping (with internal quotes doubled) whenever
 * the value contains a comma, quote, or line break.
 */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number" ? String(value) : value;
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Serialize rows to CSV text using the included columns. CRLF line endings. */
export function serializeCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const cols = columns.filter((c) => c.include !== false);
  const header = cols.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((row) =>
    cols.map((c) => escapeCell(c.value(row))).join(","),
  );
  return [header, ...body].join("\r\n");
}

/**
 * Trigger a browser download of CSV text. Prepends a UTF-8 BOM so Excel
 * detects the encoding correctly. No-op outside a DOM environment.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined") return;
  const BOM = String.fromCharCode(0xfeff); // U+FEFF byte order mark — helps Excel detect UTF-8
  const blob = new Blob([BOM, csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
