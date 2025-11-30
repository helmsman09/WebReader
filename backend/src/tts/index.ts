// align/index.ts
import { tokenizeOriginal } from "./tokenizeOriginal";
import { flattenWhisperSegments } from "./flattenSegments";
import { alignTokensWithTimings } from "./dpAlign";
import { interpolateWordTimings } from "./interpolate";
import { buildChunksFromText, ChunkTiming } from "./chunks";
import type { WordAlignment } from "./types";

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  words?: { word: string; start: number; end: number }[];
}

export interface AlignmentResult {
  text: string;
  words: WordAlignment[];
  chunks: ChunkTiming[];
}

export function buildAlignmentResult(params: {
  originalText: string;
  segments: WhisperSegment[];
}): AlignmentResult {
  const originalTokens = tokenizeOriginal(params.originalText);
  const timedTokens = flattenWhisperSegments(params.segments);
  const rawWords = alignTokensWithTimings(originalTokens, timedTokens);
  const interpWords = interpolateWordTimings(rawWords);
  const chunks = buildChunksFromText(params.originalText, interpWords);

  return {
    text: params.originalText,
    words: interpWords,
    chunks,
  };
}
