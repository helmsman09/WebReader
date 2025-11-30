// align/flattenSegments.ts
import type { TimedToken } from "./types";

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  words?: WhisperWord[];
}

export function flattenWhisperSegments(
  segments: WhisperSegment[]
): TimedToken[] {
  const tokens: TimedToken[] = [];
  let index = 0;

  for (const seg of segments) {
    if (!seg.words || seg.words.length === 0) {
      continue;
    }

    for (const w of seg.words) {
      const raw = w.word.trim();
      if (!raw) continue;

      tokens.push({
        index,
        text: raw,
        norm: normalizeWord(raw),
        start: w.start,
        end: w.end,
      });
      index++;
    }
  }

  return tokens;
}

function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}
