import "dotenv/config";
import { Worker, Job } from "bullmq";
import mongoose from "mongoose";
import { ttsQueue, PageJobData } from "../queues/queues";
import { Page } from "../models/Page";
import {synthesizeTts} from "../tts/synthesizer"
import type { TtsVoiceProfile } from "@news-capture/types";
import {uploadTtsAudioToS3} from "../aws/s3"

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/news_capture";

// Replace this stub with real storage (S3, GCS, etc.)
export async function uploadAudioAndGetUrl(
  userId: string,
  pageId: string,
  audioBuffer: Buffer,
  opts?: Object
): Promise < string > {
  console.log(
    `[TTS] Generated audio for user ${userId} page ${pageId} (size=${audioBuffer.length} bytes)`
  );
  return uploadTtsAudioToS3(userId, pageId, audioBuffer, opts);
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("[TTS] Connected to MongoDB");

  const worker = new Worker<PageJobData>(
    ttsQueue.name,
    async (job: Job<PageJobData>) => {
      const { pageId, userId } = job.data;
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
      const src = await uploadAudioAndGetUrl(
        userId,
        page._id.toString(),
        audioBuffer
      );

      page.set("tts", {
        src,
        voiceProfile: profile,
        provider,
        createdAt: new Date().toISOString()
      });

      const nextIndex = page.audioSources?.length || 0;
      page.audioSources.push({
        index: nextIndex,
        tagName: "AUDIO_TTS",
        src: src,
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
