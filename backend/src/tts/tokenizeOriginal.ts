// align/tokenizeOriginal.ts
import type { OriginalToken } from "./types";

export function tokenizeOriginal(text: string): OriginalToken[] {
  const tokens: OriginalToken[] = [];
  const wordRegex = /\p{L}+\p{M}*|\p{N}+/gu; // letters + digits

  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = wordRegex.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;
    const end = start + raw.length;

    tokens.push({
      index,
      text: raw,
      norm: normalizeWord(raw),
      charStart: start,
      charEnd: end,
    });
    index++;
  }
  return tokens;
}

function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ""); // strip punctuation, keep letters/numbers
}
