// mobile/src/types/PageAudio.ts
export interface PageAudioWord {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  start: number | null;
  end: number | null;
}

export interface PageAudioData {
  pageId: string;
  audioUrl: string;
  voiceId: string;
  durationSec?: number;
  text: string;
  words: PageAudioWord[];
}
