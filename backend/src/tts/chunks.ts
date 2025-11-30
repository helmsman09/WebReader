// align/chunks.ts
import type { WordAlignment } from "./types";

export interface ChunkTiming {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  start: number | null;
  end: number | null;
  wordIndices: number[];
}

/**
 * Basic tokenizer into sentence/paragraph chunks using punctuation and newlines.
 * Not perfect, but works well for highlighting.
 */
export function buildChunksFromText(
  text: string,
  words: WordAlignment[]
): ChunkTiming[] {
  const chunks: ChunkTiming[] = [];

  const boundaries: number[] = [0];
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];

    if (ch === "\n") {
      if (i + 1 <= len) boundaries.push(i + 1);
    } else if (/[.!?]/.test(ch)) {
      // sentence boundary if followed by space/newline/end
      const next = text[i + 1];
      if (next === " " || next === "\n" || next === undefined) {
        if (i + 1 <= len) boundaries.push(i + 1);
      }
    }
  }

  if (boundaries[boundaries.length - 1] !== len) {
    boundaries.push(len);
  }

  // coalesce into chunks
  for (let k = 0; k < boundaries.length - 1; k++) {
    const start = boundaries[k];
    const end = boundaries[k + 1];

    const raw = text.slice(start, end).trim();
    if (!raw) continue;

    chunks.push({
      index: chunks.length,
      text: raw,
      charStart: start,
      charEnd: end,
      start: null,
      end: null,
      wordIndices: [],
    });
  }

  // assign words to chunks based on char ranges
  for (const w of words) {
    const mid = (w.charStart + w.charEnd) / 2;
    const chunk = chunks.find(
      c => mid >= c.charStart && mid < c.charEnd
    );
    if (!chunk) continue;
    chunk.wordIndices.push(w.index);
  }

  // compute chunk start/end from words
  for (const chunk of chunks) {
    let start: number | null = null;
    let end: number | null = null;

    for (const idx of chunk.wordIndices) {
      const w = words[idx];
      if (w.start == null || w.end == null) continue;
      if (start == null || w.start < start) start = w.start;
      if (end == null || w.end > end) end = w.end;
    }

    chunk.start = start;
    chunk.end = end;
  }

  return chunks;
}
