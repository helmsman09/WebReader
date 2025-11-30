export function getFileExtension(path: string): string {
  const qIdx = path.indexOf("?");
  if (qIdx >= 0) path = path.slice(0, qIdx); // strip query params

  const lastDot = path.lastIndexOf(".");
  if (lastDot < 0) return "";
  return path.slice(lastDot + 1).toLowerCase();
}