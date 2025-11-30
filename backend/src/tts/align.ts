// align.ts

interface WordTiming {
  text: string;
  start: number;
  end: number;
}

interface ChunkTiming {
  text: string;     // original chunk text
  start: number;    // seconds
  end: number;      // seconds
  words?: WordTiming[];
}

export function alignTranscriptToOriginal(params: {
  originalText: string;
  whisperText: string;
  segments: {
    start: number;
    end: number;
    text: string;
    words?: { word: string; start: number; end: number }[];
  }[];
}): ChunkTiming[] {
  const { originalText, whisperText, segments } = params;

  // naive: split original into sentences
  const rawChunks = originalText
    .split(/([\.!?]\s+|\n+)/) // keep delimiters; you may want a more robust splitter
    .map(s => s.trim())
    .filter(Boolean);

  // flatten word timings from segments
  const allWords: WordTiming[] = [];
  for (const seg of segments) {
    if (!seg.words) continue;
    for (const w of seg.words) {
      allWords.push({
        text: normalizeWord(w.word),
        start: w.start,
        end: w.end,
      });
    }
  }

  // naive mapping: walk through original words and attach timings in order
  const result: ChunkTiming[] = [];

  let wordIndex = 0;

  for (const chunk of rawChunks) {
    const chunkWords = chunk.split(/\s+/).filter(Boolean);
    const normalizedChunkWords = chunkWords.map(normalizeWord);

    let chunkStart: number | null = null;
    let chunkEnd: number | null = null;
    const wordTimings: WordTiming[] = [];

    for (const w of normalizedChunkWords) {
      // advance allWords pointer until we find a close match or bail
      while (
        wordIndex < allWords.length &&
        !approxEquals(allWords[wordIndex].text, w)
      ) {
        wordIndex++;
      }

      if (wordIndex >= allWords.length) {
        break;
      }

      const match = allWords[wordIndex];
      if (chunkStart === null) chunkStart = match.start;
      chunkEnd = match.end;
      wordTimings.push(match);
      wordIndex++;
    }

    if (chunkStart === null || chunkEnd === null) {
      // fallback: approximate positions using previous/next known times
      // for now, just skip if no words matched
      continue;
    }

    result.push({
      text: chunk,
      start: chunkStart,
      end: chunkEnd,
      words: wordTimings,
    });
  }

  return result;
}

function normalizeWord(w: string) {
  return w.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function approxEquals(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;
  // simple edit-distance-ish check: startswith or 1-char diff
  return a.startsWith(b) || b.startsWith(a);
}
