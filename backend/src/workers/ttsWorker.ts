import "dotenv/config";
import { Worker, Job } from "bullmq";
import mongoose from "mongoose";
import { ttsQueue, PageJobData } from "../queues/queues";
import { Page } from "../models/Page";
import type { TtsVoiceProfile } from "@news-capture/types";
import OpenAI from "openai";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/news_capture";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function mapVoiceProfileToProviderVoice(
  profile: TtsVoiceProfile
): { provider: string; voiceId: string } {
  // Simple mapping, adjust to your needs
  switch (profile) {
    case "boy":
      return { provider: "openai", voiceId: "alloy" };
    case "girl":
      return { provider: "openai", voiceId: "alloy" };
    case "man":
      return { provider: "openai", voiceId: "alloy" };
    case "woman":
      return { provider: "openai", voiceId: "alloy" };
    default:
      return { provider: "openai", voiceId: "alloy" };
  }
}

async function synthesizeTts(
  text: string,
  profile: TtsVoiceProfile
): Promise<{ audioBuffer: Buffer; provider: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const { provider, voiceId } = mapVoiceProfileToProviderVoice(profile);

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: voiceId,
    input: text
  });

  // @ts-ignore
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  return { audioBuffer, provider };
}

// Replace this stub with real storage (S3, GCS, etc.)
async function uploadAudioAndGetUrl(
  pageId: string,
  audioBuffer: Buffer
): Promise<string> {
  console.log(
    `[TTS] Generated audio for page ${pageId} (size=${audioBuffer.length} bytes)`
  );
  return `https://example.com/audio/${pageId}-tts.mp3`;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("[TTS] Connected to MongoDB");

  const worker = new Worker<PageJobData>(
    ttsQueue.name,
    async (job: Job<PageJobData>) => {
      const { pageId } = job.data;
      const page = await Page.findById(pageId).exec();
      if (!page) {
        console.warn(`[TTS] Page not found: ${pageId}`);
        return;
      }

      if (!page.mainText) {
        console.warn(`[TTS] Page ${pageId} has no mainText`);
        return;
      }

      const profile = ((page as any).ttsVoiceProfile ||
        "man") as TtsVoiceProfile;

      const { audioBuffer, provider } = await synthesizeTts(
        page.mainText,
        profile
      );
      const audioUrl = await uploadAudioAndGetUrl(
        page._id.toString(),
        audioBuffer
      );

      page.set("tts", {
        audioUrl,
        voiceProfile: profile,
        provider,
        createdAt: new Date().toISOString()
      });

      const nextIndex = page.audioSources?.length || 0;
      page.audioSources.push({
        index: nextIndex,
        tagName: "AUDIO_TTS",
        src: audioUrl,
        type: "audio/mpeg"
      } as any);

      await page.save();
      console.log(`[TTS] Generated TTS for page ${pageId}`);
    },
    { connection: (ttsQueue as any).opts.connection, concurrency: 2 }
  );

  worker.on("completed", (job) => {
    console.log(`[TTS] Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[TTS] Job ${job?.id} failed:`, err);
  });
}

main().catch((err) => {
  console.error("[TTS] Fatal error:", err);
  process.exit(1);
});
