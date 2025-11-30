// src/tts/pipeline.ts
import { Types } from "mongoose";
import { PageAudioModel } from "../models/PageAudio";
import { generateTtsMp3ForText } from "./tts";
import { transcribeAndAlignTtsAudio } from "./alignTranscribe";

interface GenerateTtsWithAlignmentParams {
  pageId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  text: string;
  voiceId: string;
}

export async function generateTtsWithAlignment(
  params: GenerateTtsWithAlignmentParams
) {
  const { pageId, userId, text, voiceId } = params;

  // 1) Generate TTS + upload to S3 (MP3)
  const { audioBuffer, audioUrl } = await generateTtsMp3ForText({
    userId: String(userId),
    text,
    voiceId,
  });

  // 2) Transcribe + align (word-level + chunk-level)
  const alignment = await transcribeAndAlignTtsAudio({
    audioBuffer,
    originalText: text,
  });
  // alignment: { text, words, chunks }

  // Optionally compute durationMs if you want (e.g. from alignment or ffprobe).
  // For now we’ll leave it undefined:
  const durationMs: number | undefined = undefined;

  // 3) Save to Mongo
  const doc = await PageAudioModel.create({
    pageId,
    kind: "full",
    voiceId,
    audioUrl,
    durationMs,
    text: alignment.text,
    words: alignment.words,
    chunks: alignment.chunks,
  });

  return doc;
}