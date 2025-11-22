import { Queue, QueueOptions } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10)
};

export interface PageJobData {
  pageId: string;
  userId: string;
}

export const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 }
};

export const summaryQueue = new Queue<PageJobData>("summary-queue", {
  connection,
  defaultJobOptions
} as QueueOptions);

export const ttsQueue = new Queue<PageJobData>("tts-queue", {
  connection,
  defaultJobOptions,
  limiter: {
    max: parseInt(process.env.TTS_MAX_JPM || "30", 10),
    duration: 60_000
  }
} as QueueOptions);
