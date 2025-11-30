// align/interpolate.ts
import type { WordAlignment } from "./types";

/**
 * Fill null timings using neighbors.
 * - If a word is between two timed words → linear interpolation.
 * - If only prev or next timed exists → copy nearest timing.
 * - If no timings at all → leave as null.
 */
export function interpolateWordTimings(words: WordAlignment[]): WordAlignment[] {
  const n = words.length;
  if (n === 0) return words;

  // collect indices of timed words
  const timedIdx: number[] = [];
  for (let i = 0; i < n; i++) {
    if (words[i].start != null && words[i].end != null) {
      timedIdx.push(i);
    }
  }
  if (timedIdx.length === 0) {
    // nothing to interpolate with
    return words;
  }

  const result = words.map(w => ({ ...w }));

  const firstTimed = timedIdx[0];
  const lastTimed = timedIdx[timedIdx.length - 1];

  // left of first timed: copy first timed
  for (let i = 0; i < firstTimed; i++) {
    const ref = result[firstTimed];
    result[i].start = ref.start;
    result[i].end = ref.end;
  }

  // right of last timed: copy last timed
  for (let i = lastTimed + 1; i < n; i++) {
    const ref = result[lastTimed];
    result[i].start = ref.start;
    result[i].end = ref.end;
  }

  // between timed words: interpolate
  for (let t = 0; t < timedIdx.length - 1; t++) {
    const i0 = timedIdx[t];
    const i1 = timedIdx[t + 1];

    const w0 = result[i0];
    const w1 = result[i1];

    const span = i1 - i0;
    if (span <= 1) continue;

    for (let k = i0 + 1; k < i1; k++) {
      const frac = (k - i0) / span; // 0..1
      result[k].start =
        (w0.start as number) +
        frac * ((w1.start as number) - (w0.start as number));
      result[k].end =
        (w0.end as number) +
        frac * ((w1.end as number) - (w0.end as number));
    }
  }

  return result;
}
