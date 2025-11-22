import "dotenv/config";
import { Worker, Job } from "bullmq";
import mongoose from "mongoose";
import { summaryQueue, PageJobData } from "../queues/queues";
import { Page } from "../models/Page";
import OpenAI from "openai";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/news_capture";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function summarizeText(text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const trimmed = text.slice(0, 8000);

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a concise financial/news reading assistant. Summarize the article in 3–6 bullet points focusing on key facts, numbers, and takeaways."
      },
      {
        role: "user",
        content: trimmed
      }
    ],
    temperature: 0.2
  });

  const out = response.choices[0]?.message?.content || "";
  return out.trim();
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("[Summary] Connected to MongoDB");

  const worker = new Worker<PageJobData>(
    summaryQueue.name,
    async (job: Job<PageJobData>) => {
      const { pageId } = job.data;
      const page = await Page.findById(pageId).exec();
      if (!page) {
        console.warn(`[Summary] Page not found: ${pageId}`);
        return;
      }

      if (!page.mainText) {
        console.warn(`[Summary] Page ${pageId} has no mainText`);
        return;
      }

      const summary = await summarizeText(page.mainText);
      page.summary = summary;
      page.summaryProvider = "openai";
      page.summaryCreatedAt = new Date().toISOString();
      await page.save();

      console.log(`[Summary] Summarized page ${pageId}`);
    },
    { connection: (summaryQueue as any).opts.connection, concurrency: 2 }
  );

  worker.on("completed", (job) => {
    console.log(`[Summary] Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[Summary] Job ${job?.id} failed:`, err);
  });
}

main().catch((err) => {
  console.error("[Summary] Fatal error:", err);
  process.exit(1);
});
