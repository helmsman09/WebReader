export type LayoutTemplate =
  | "image-top-text"
  | "image-flow"
  | "text-only"
  | "audio-only";

export type Block =
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
      type: "image";
      id: string;
      src: string;
      alt?: string;
      caption?: string;
      width?: number;
      height?: number;
    }
  | {
      type: "audio";
      id: string;
      src: string;
      title?: string;
    };

export interface CapturedMeta {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  metaDescription?: string;
  siteName?: string;
}

export interface CapturedPage {
  url: string;
  title: string;
  layoutTemplate: LayoutTemplate;
  blocks: Block[];
  meta?: CapturedMeta;
}

export interface ExtensionSettings {
  backendUrl: string;
  apiKey: string;
  defaultSharingMode: "private" | "unlisted" | "shared";
  dashboardUrl: string;
}
