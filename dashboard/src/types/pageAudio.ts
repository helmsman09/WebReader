export interface PageAudioWord {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  start: number | null;
  end: number | null;
}

export interface PageAudioChunk {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  start: number | null;
  end: number | null;
  wordIndices: number[];
}

export interface PageAudioResponse {
  id: string; // audio document id
  pageId: string;
  audioUrl: string;
  voiceId: string;
  durationSec?: number;
  text: string;
  words: PageAudioWord[];
  chunks: PageAudioChunk[];
}
