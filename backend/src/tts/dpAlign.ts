// align/dpAlign.ts
import type { OriginalToken, TimedToken, WordAlignment } from "./types";

export function alignTokensWithTimings(
  originalTokens: OriginalToken[],
  timedTokens: TimedToken[]
): WordAlignment[] {
  const n = originalTokens.length;
  const m = timedTokens.length;

  // dp[i][j] = cost to align first i of A with first j of B
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );
  const back: ("diag" | "up" | "left")[][] = Array.from(
    { length: n + 1 },
    () => new Array(m + 1).fill("diag")
  );

  // init
  for (let i = 1; i <= n; i++) {
    dp[i][0] = i; // delete i tokens from A
    back[i][0] = "up";
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j; // insert j tokens from B
    back[0][j] = "left";
  }

  const approxEquals = (a: string, b: string) => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (Math.abs(a.length - b.length) > 2) return false;
    return a.startsWith(b) || b.startsWith(a);
  };

  // fill
  for (let i = 1; i <= n; i++) {
    const a = originalTokens[i - 1];
    for (let j = 1; j <= m; j++) {
      const b = timedTokens[j - 1];

      const matchCost = approxEquals(a.norm, b.norm) ? 0 : 1;

      const costDiag = dp[i - 1][j - 1] + matchCost; // substitute / match
      const costUp = dp[i - 1][j] + 1; // delete A[i-1]
      const costLeft = dp[i][j - 1] + 1; // insert B[j-1]

      let best = costDiag;
      let dir: "diag" | "up" | "left" = "diag";

      if (costUp < best) {
        best = costUp;
        dir = "up";
      }
      if (costLeft < best) {
        best = costLeft;
        dir = "left";
      }

      dp[i][j] = best;
      back[i][j] = dir;
    }
  }

  // backtrack: map A[i] -> B[j] where we came from diag
  const alignedIndex: Array<number | null> = new Array(n).fill(null);
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    const dir = back[i][j];

    if (dir === "diag") {
      // A[i-1] aligned with B[j-1] (match or substitution)
      alignedIndex[i - 1] = j - 1;
      i--;
      j--;
    } else if (dir === "up") {
      // delete A[i-1]: no timing
      alignedIndex[i - 1] = null;
      i--;
    } else {
      // 'left' => extra word in B not mapped to A
      j--;
    }
  }

  // Build WordAlignment list
  const result: WordAlignment[] = [];

  for (let k = 0; k < n; k++) {
    const orig = originalTokens[k];
    const bIndex = alignedIndex[k];

    if (bIndex != null && bIndex >= 0 && bIndex < m) {
      const timed = timedTokens[bIndex];
      result.push({
        index: orig.index,
        text: orig.text,
        charStart: orig.charStart,
        charEnd: orig.charEnd,
        start: timed.start,
        end: timed.end,
      });
    } else {
      // no direct match => leave timing null
      result.push({
        index: orig.index,
        text: orig.text,
        charStart: orig.charStart,
        charEnd: orig.charEnd,
        start: null,
        end: null,
      });
    }
  }

  return result;
}
