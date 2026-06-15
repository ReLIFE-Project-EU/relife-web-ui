/**
 * Trigger a browser download of in-memory content via a temporary object URL.
 * No-op outside a DOM environment (e.g. SSR or tests without jsdom).
 */
export function downloadBlob(
  filename: string,
  parts: BlobPart[],
  mimeType: string,
): void {
  if (typeof document === "undefined") return;
  const blob = new Blob(parts, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
