export type TtsVoiceProfile = "boy" | "girl" | "man" | "woman";

export interface TtsInfo {
  audioUrl: string;
  voiceProfile: TtsVoiceProfile;
  provider: string;
  createdAt: string;
}

export type PageSourceType =
  | "web-page"
  | "uploaded-text"
  | "uploaded-pdf"
  | "uploaded-audio"
  | "uploaded-page";

export type PageTemplate =
  | "image-top-text"
  | "image-flow"
  | "text-only"
  | "audio-only";

export type ContentBlock =
  | {
      type: "image";
      id: string;
      src: string;
      alt?: string;
      caption?: string;
      width?: number;
      height?: number;
    }
  | {
      type: "paragraph";
      id: string;
      text: string;
    }
  | {
      type: "heading";
      id: string;
      text: string;
      level: 1 | 2 | 3;
    }
  | {
      type: "audio";
      id: string;
      src: string;
      title?: string;
    };

export interface Paragraph {
  index: number;
  text: string;
}

export interface ArticleImageWithCategory {
  index: number;
  src: string;
  alt: string;
  width: number;
  height: number;
  category: string;
  ocrText?: string;
}

export interface AudioSource {
  index: number;
  tagName: string;
  src: string;
  type: string;
}

export type PageSharingMode = "private" | "unlisted" | "shared" | "public";

export const PRESET_TAGS = [
  "Earnings",
  "AI",
  "Macro",
  "Politics",
  "Tech",
  "Crypto",
  "Healthcare",
  "China",
  "US Markets",
  "Startups"
] as const;

export type PresetTag = (typeof PRESET_TAGS)[number];

export interface PageMeta {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  metaDescription?: string;
  siteName?: string;
}

export interface PageDTO {
  _id: string;
  userId: string;
  url: string;
  title: string;
  mainText: string;
  paragraphs: Paragraph[];
  images: ArticleImageWithCategory[];
  audioSources: AudioSource[];
  tags: string[];
  isFavorite: boolean;
  sourceType: PageSourceType;
  layoutTemplate?: PageTemplate;
  blocks?: ContentBlock[];
  tts?: TtsInfo | null;
  sharingMode?: PageSharingMode;
  sharedWithUserIds?: string[];
  summary?: string;
  summaryProvider?: string;
  summaryCreatedAt?: string;
  createdAt: string;
  updatedAt: string;
  meta?: PageMeta;
}
