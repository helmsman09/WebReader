// align/types.ts
export interface OriginalToken {
  index: number;
  text: string;        // raw token, e.g. "Hello"
  norm: string;        // normalized, e.g. "hello"
  charStart: number;   // index into originalText
  charEnd: number;     // index into originalText (exclusive)
}

export interface TimedToken {
  index: number;
  text: string;        // raw word from Whisper
  norm: string;        // normalized
  start: number;       // seconds
  end: number;         // seconds
}

export interface WordAlignment {
  index: number;       // index in original token list
  text: string;        // original token text
  charStart: number;
  charEnd: number;
  start: number | null;
  end: number | null;
}
