import mongoose, { Schema, Document } from "mongoose";
import type {
  Paragraph,
  ArticleImageWithCategory,
  AudioSource,
  TtsInfo,
  PageTemplate,
  PageSourceType,
  PageSharingMode,
  ContentBlock,
  PageMeta
} from "@news-capture/types";

export interface IPage extends Document {
  userId: mongoose.Types.ObjectId;
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
  meta?: PageMeta;
}

const ParagraphSchema = new Schema<Paragraph>(
  {
    index: Number,
    text: String
  },
  { _id: false }
);

const ImageSchema = new Schema<ArticleImageWithCategory>(
  {
    index: Number,
    src: String,
    alt: String,
    width: Number,
    height: Number,
    category: String,
    ocrText: String
  },
  { _id: false }
);

const AudioSourceSchema = new Schema<AudioSource>(
  {
    index: Number,
    tagName: String,
    src: String,
    type: String
  },
  { _id: false }
);

const TtsSchema = new Schema<TtsInfo>(
  {
    audioUrl: String,
    voiceProfile: String,
    provider: String,
    createdAt: String
  },
  { _id: false }
);

const PageMetaSchema = new Schema<PageMeta>(
  {
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    twitterTitle: String,
    twitterDescription: String,
    twitterImage: String,
    metaDescription: String,
    siteName: String
  },
  { _id: false }
);

const PageSchema = new Schema<IPage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    url: { type: String, required: true },
    title: { type: String, default: "" },
    mainText: { type: String, default: "" },
    paragraphs: { type: [ParagraphSchema], default: [] },
    images: { type: [ImageSchema], default: [] },
    audioSources: { type: [AudioSourceSchema], default: [] },

    tags: { type: [String], default: [] },
    isFavorite: { type: Boolean, default: false },

    sourceType: { type: String, default: "uploaded-page" },
    layoutTemplate: { type: String, default: "text-only" },

    blocks: { type: [Schema.Types.Mixed], default: [] },

    tts: { type: TtsSchema, default: null },

    sharingMode: { type: String, default: "private" },
    sharedWithUserIds: { type: [String], default: [] },

    summary: { type: String, default: "" },
    summaryProvider: { type: String, default: "" },
    summaryCreatedAt: { type: String, default: "" },

    meta: { type: PageMetaSchema, default: undefined }
  },
  { timestamps: true }
);

export const Page = mongoose.model<IPage>("Page", PageSchema);
