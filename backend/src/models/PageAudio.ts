// src/models/PageAudio.ts
import { Schema, model, Types, Document } from "mongoose";

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

export interface PageAudio {
  _id: Types.ObjectId;
  pageId: Types.ObjectId;
  kind: "full" | "section";
  voiceId: string;
  audioUrl: string;
  s3Key: string;
  durationMs?: number;
  text: string;               // full text used for alignment
  words: PageAudioWord[];     // word-level alignments
  chunks: PageAudioChunk[];   // sentence/paragraph chunks
  createdAt: Date;
  updatedAt: Date;
}

export type PageAudioDocument = PageAudio & Document;

// ---- sub-schemas ----

const wordSchema = new Schema<PageAudioWord>(
  {
    index: { type: Number, required: true },
    text: { type: String, required: true },
    charStart: { type: Number, required: true },
    charEnd: { type: Number, required: true },
    start: { type: Number, default: null },
    end: { type: Number, default: null },
  },
  { _id: false }
);

const chunkSchema = new Schema<PageAudioChunk>(
  {
    index: { type: Number, required: true },
    text: { type: String, required: true },
    charStart: { type: Number, required: true },
    charEnd: { type: Number, required: true },
    start: { type: Number, default: null },
    end: { type: Number, default: null },
    wordIndices: { type: [Number], default: [] },
  },
  { _id: false }
);

// ---- main schema ----

const pageAudioSchema = new Schema<PageAudioDocument>(
  {
    pageId: {
      type: Schema.Types.ObjectId,
      ref: "Page",
      required: true,
    },
    kind: {
      type: String,
      enum: ["full", "section"],
      default: "full",
    },
    voiceId: { type: String, required: true },
    audioUrl: { type: String, required: true },
    s3Key: { type: String, required: true },
    durationMs: { type: Number },

    text: { type: String, required: true },
    words: { type: [wordSchema], default: [] },
    chunks: { type: [chunkSchema], default: [] },
  },
  { timestamps: true }
);

export const PageAudioModel = model<PageAudioDocument>(
  "PageAudio",
  pageAudioSchema
);
