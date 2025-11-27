import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import type { Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import pdfParse from "pdf-parse";
import { User } from "./models/User";
import { Page } from "./models/Page";
import type {
  ContentBlock,
  PageTemplate,
  PageSourceType,
  PageMeta
} from "@news-capture/types";
import { deriveFromBlocks } from "./utils/blocksToPageFields";
import {
  summaryQueue,
  ttsQueue,
  defaultJobOptions
} from "./queues/queues";
import authDeviceRouter from "./routes/auth";
import authMergeRouter from "./routes/authMerge";
import meDevicesRouter from "./routes/meDevices";
import meDevicesActionsRouter from "./routes/meDevicesActions";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/news_capture";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("[backend] Mongo connected"))
  .catch((err) => console.error("Mongo error", err));

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const upload = multer({ dest: path.join(process.cwd(), "tmp_uploads") });

interface AuthedRequest extends Request {
  user?: any;
}

// before your routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use("/api/auth", authDeviceRouter);
app.use("/api/auth", authMergeRouter);
app.use("/api", meDevicesRouter);
app.use("/api", meDevicesActionsRouter);

async function authWithApiKey(
  req: AuthedRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  if (!token) {
    return res.status(401).json({ error: "Missing API key" });
  }
  const user = await User.findOne({ apiKey: token }).exec();
  if (!user) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  req.user = user;
  next();
}

function ensureTmpDir() {
  const tmpDir = path.join(process.cwd(), "tmp_uploads");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
}

async function parsePdfText(filePath: string): Promise<string> {
  const dataBuffer = await fs.promises.readFile(filePath);
  const parsed = await pdfParse(dataBuffer);
  return parsed.text || "";
}

// stub storage for uploaded files
async function storeUploadedFile(
  filePath: string,
  originalName: string,
  logicalPrefix: string
): Promise<string> {
  const safeName = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  console.log(
    `[Storage] Received file for ${logicalPrefix}: ${safeName} (path=${filePath})`
  );
  return `https://example.com/uploads/${logicalPrefix}/${safeName}`;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get(
  "/api/me/pages/:id",
  authWithApiKey,
  async (req: AuthedRequest, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user!._id; // adapt to your auth

      // Only return pages owned by this user
      const page = await Page.findOne({ _id: id, userId }).lean().exec();

      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }

      return res.json(page); // or { page } if you prefer
    } catch (err) {
      next(err);
    }
  }
);

// List pages for current user with optional tag filter
app.get("/api/me/pages", authWithApiKey, async (req: AuthedRequest, res) => {
  try {
    const user = req.user;
    const { tag } = req.query;
    const q: any = { userId: user._id };
    if (tag && typeof tag === "string") {
      q.tags = tag;
    }
    const pages = await Page.find(q).sort({ createdAt: -1 }).limit(200).lean();
    res.json(pages);
  } catch (err) {
    console.error("GET /api/me/pages error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List distinct tags for current user
app.get("/api/me/tags", authWithApiKey, async (req: AuthedRequest, res) => {
  try {
    const user = req.user;
    const agg = await Page.aggregate([
      { $match: { userId: user._id } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const tags = agg.map((row) => ({ tag: row._id, count: row.count }));
    res.json(tags);
  } catch (err) {
    console.error("GET /api/me/tags error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update tags on a page
app.patch(
  "/api/pages/:id/tags",
  authWithApiKey,
  async (req: AuthedRequest, res) => {
    try {
      const user = req.user;
      const pageId = req.params.id;
      const { tags } = req.body as { tags?: string[] };

      const page = await Page.findOne({ _id: pageId, userId: user._id }).exec();
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }

      const normalized =
        Array.isArray(tags)
          ? tags.map((t) => String(t).trim()).filter((t) => t.length > 0)
          : [];

      page.tags = normalized;
      await page.save();
      res.json({ ok: true, tags: page.tags });
    } catch (err) {
      console.error("PATCH /api/pages/:id/tags error", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Trigger TTS generation for a page
app.post(
  "/api/pages/:id/tts",
  authWithApiKey,
  async (req: AuthedRequest, res) => {
    try {
      const user = req.user;
      const pageId = req.params.id;
      const { voiceProfile } = req.body as { voiceProfile?: string };

      const page = await Page.findOne({ _id: pageId, userId: user._id }).exec();
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      if (!page.mainText) {
        return res.status(400).json({ error: "Page has no text for TTS" });
      }

      if (voiceProfile) {
        (page as any).ttsVoiceProfile = voiceProfile;
        await page.save();
      }

      await ttsQueue.add(
        "generateTts",
        { pageId: page._id.toString(), userId: user._id.toString() },
        defaultJobOptions
      );

      res.json({ ok: true, queued: true });
    } catch (err) {
      console.error("POST /api/pages/:id/tts error", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Trigger (re)summary for a page
app.post(
  "/api/pages/:id/summary",
  authWithApiKey,
  async (req: AuthedRequest, res) => {
    try {
      const user = req.user;
      const pageId = req.params.id;

      const page = await Page.findOne({ _id: pageId, userId: user._id }).exec();
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      if (!page.mainText) {
        return res.status(400).json({ error: "Page has no text to summarize" });
      }

      await summaryQueue.add(
        "summarizePage",
        { pageId: page._id.toString(), userId: user._id.toString() },
        defaultJobOptions
      );

      res.json({ ok: true, queued: true });
    } catch (err) {
      console.error("POST /api/pages/:id/summary error", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Upload text-only page shortcut
app.post(
  "/api/uploads/text",
  authWithApiKey,
  async (req: AuthedRequest, res) => {
    try {
      const user = req.user;
      const { title, body, tags, sharingMode, url, meta } = req.body as {
        title?: string;
        body?: string;
        tags?: string[];
        sharingMode?: "private" | "unlisted" | "shared";
        url?: string;
        meta?: PageMeta;
      };

      if (!body) {
        return res.status(400).json({ error: "body is required" });
      }

      const blocks: ContentBlock[] = [
        {
          type: "paragraph",
          id: "p1",
          text: body
        }
      ];

      const { mainText, paragraphs, images } = deriveFromBlocks(blocks);

      const normalizedTags =
        Array.isArray(tags)
          ? tags.map((t) => String(t).trim()).filter((t) => t.length > 0)
          : [];

      const page = await Page.create({
        userId: user._id,
        url: url || `app://uploaded-text/${Date.now()}`,
        title: title || "",
        mainText,
        paragraphs,
        images,
        audioSources: [],
        tags: normalizedTags,
        sourceType: "uploaded-text" as PageSourceType,
        layoutTemplate: "text-only" as PageTemplate,
        blocks,
        sharingMode: sharingMode || "private",
        meta
      });

      if (mainText.trim().length > 0) {
        await summaryQueue.add(
          "summarizePage",
          { pageId: page._id.toString(), userId: user._id.toString() },
          defaultJobOptions
        );
      }

      res.json({ ok: true, page });
    } catch (err) {
      console.error("POST /api/uploads/text error", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Upload a PDF and create a text-only page
app.post(
  "/api/uploads/pdf",
  authWithApiKey,
  upload.single("file"),
  async (req: AuthedRequest, res) => {
    try {
      const user = req.user;
      const file = (req as any).file as Express.Multer.File | undefined;
      const { title, tags, sharingMode, url, meta } = req.body as {
        title?: string;
        tags?: string;
        sharingMode?: "private" | "unlisted" | "shared";
        url?: string;
        meta?: string;
      };

      if (!file) {
        return res.status(400).json({ error: "file is required" });
      }

      ensureTmpDir();

      const tagArray =
        typeof tags === "string" && tags.length
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

      const extractedText = await parsePdfText(file.path);

      const blocks: ContentBlock[] = [
        { type: "paragraph", id: "p1", text: extractedText }
      ];

      const { mainText, paragraphs, images } = deriveFromBlocks(blocks);

      const parsedMeta: PageMeta | undefined = meta
        ? (JSON.parse(meta) as PageMeta)
        : undefined;

      const page = await Page.create({
        userId: user._id,
        url: url || `app://uploaded-pdf/${Date.now()}`,
        title: title || file.originalname || "",
        mainText,
        paragraphs,
        images,
        audioSources: [],
        tags: tagArray,
        sourceType: "uploaded-pdf" as PageSourceType,
        layoutTemplate: "text-only" as PageTemplate,
        blocks,
        sharingMode: sharingMode || "private",
        meta: parsedMeta
      });

      if (mainText.trim().length > 0) {
        await summaryQueue.add(
          "summarizePage",
          { pageId: page._id.toString(), userId: user._id.toString() },
          defaultJobOptions
        );
      }

      res.json({ ok: true, page });
    } catch (err) {
      console.error("POST /api/uploads/pdf error", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      try {
        const file = (req as any).file as Express.Multer.File | undefined;
        if (file && file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (e) {
        console.warn("Failed to cleanup pdf temp file", e);
      }
    }
  }
);

// Upload an audio file and create an audio-only page
app.post(
  "/api/uploads/audio",
  authWithApiKey,
  upload.single("file"),
  async (req: AuthedRequest, res) => {
    try {
      const user = req.user;
      const file = (req as any).file as Express.Multer.File | undefined;
      const { title, tags, sharingMode, url, meta } = req.body as {
        title?: string;
        tags?: string;
        sharingMode?: "private" | "unlisted" | "shared";
        url?: string;
        meta?: string;
      };

      if (!file) {
        return res.status(400).json({ error: "file is required" });
      }

      ensureTmpDir();

      const tagArray =
        typeof tags === "string" && tags.length
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

      const audioUrl = await storeUploadedFile(
        file.path,
        file.originalname || file.filename,
        "audio"
      );

      const audioSources = [
        {
          index: 0,
          tagName: "AUDIO_USER",
          src: audioUrl,
          type: file.mimetype || "audio/mpeg"
        }
      ];

      const blocks: ContentBlock[] = [
        {
          type: "audio",
          id: "a1",
          src: audioUrl,
          title: title || file.originalname || "Uploaded audio"
        }
      ];

      const { mainText, paragraphs, images } = deriveFromBlocks(blocks);

      const parsedMeta: PageMeta | undefined = meta
        ? (JSON.parse(meta) as PageMeta)
        : undefined;

      const page = await Page.create({
        userId: user._id,
        url: url || `app://uploaded-audio/${Date.now()}`,
        title: title || file.originalname || "",
        mainText,
        paragraphs,
        images,
        audioSources,
        tags: tagArray,
        sourceType: "uploaded-audio" as PageSourceType,
        layoutTemplate: "audio-only" as PageTemplate,
        blocks,
        sharingMode: sharingMode || "private",
        meta: parsedMeta
      });

      res.json({ ok: true, page });
    } catch (err) {
      console.error("POST /api/uploads/audio error", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      try {
        const file = (req as any).file as Express.Multer.File | undefined;
        if (file && file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (e) {
        console.warn("Failed to cleanup audio temp file", e);
      }
    }
  }
);

// Generic uploaded-page handler with blocks (used by extension)
app.post(
  "/api/uploads/page",
  authWithApiKey,
  async (req: AuthedRequest, res) => {
    try {
      const user = req.user;
      const {
        title,
        tags,
        sharingMode,
        sharedWithUserIds,
        sourceType,
        layoutTemplate,
        blocks,
        url,
        meta
      } = req.body as {
        title?: string;
        tags?: string[];
        sharingMode?: "private" | "unlisted" | "shared";
        sharedWithUserIds?: string[];
        sourceType?: PageSourceType;
        layoutTemplate?: PageTemplate;
        blocks?: ContentBlock[];
        url?: string;
        meta?: PageMeta;
      };

      if (!Array.isArray(blocks) || blocks.length === 0) {
        return res
          .status(400)
          .json({ error: "blocks[] is required and cannot be empty" });
      }

      for (const b of blocks) {
        if (!b || typeof b !== "object") {
          return res.status(400).json({ error: "invalid block in blocks[]" });
        }
        if (!(b as any).type || typeof (b as any).id !== "string") {
          return res.status(400).json({ error: "block must have type and id" });
        }
      }

      const normalizedTags =
        Array.isArray(tags)
          ? tags.map((t) => String(t).trim()).filter((t) => t.length > 0)
          : [];

      const { mainText, paragraphs, images } = deriveFromBlocks(blocks);

      const effectiveSource: PageSourceType = sourceType || "uploaded-page";
      const effectiveLayout: PageTemplate =
        layoutTemplate || guessTemplateFromBlocks(blocks);

      const effectiveSharing: "private" | "unlisted" | "shared" =
        sharingMode || "private";

      const page = await Page.create({
        userId: user._id,
        url: url || `app://uploaded-page/${Date.now()}`,
        title: title || "",
        mainText,
        paragraphs,
        images,
        audioSources: deriveAudioSourcesFromBlocks(blocks),
        tags: normalizedTags,
        sourceType: effectiveSource,
        layoutTemplate: effectiveLayout,
        blocks,
        sharingMode: effectiveSharing,
        sharedWithUserIds:
          effectiveSharing === "shared" && Array.isArray(sharedWithUserIds)
            ? sharedWithUserIds
            : [],
        meta
      });

      if (mainText.trim().length > 0) {
        await summaryQueue.add(
          "summarizePage",
          { pageId: page._id.toString(), userId: user._id.toString() },
          defaultJobOptions
        );
      }

      res.json({ ok: true, page });
    } catch (err) {
      console.error("POST /api/uploads/page error", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

function guessTemplateFromBlocks(blocks: ContentBlock[]): PageTemplate {
  const hasImages = blocks.some((b) => b.type === "image");
  const hasAudio = blocks.some((b) => b.type === "audio");
  const hasText = blocks.some(
    (b) => b.type === "paragraph" || b.type === "heading"
  );

  if (hasAudio && !hasText && !hasImages) return "audio-only";
  if (!hasAudio && hasText && !hasImages) return "text-only";
  if (hasImages && !hasText && !hasAudio) return "image-top-text";
  return "image-flow";
}

function deriveAudioSourcesFromBlocks(blocks: ContentBlock[]) {
  let idx = 0;
  const audioBlocks = blocks.filter((b) => b.type === "audio") as any[];
  return audioBlocks.map((b) => ({
    index: idx++,
    tagName: "AUDIO_BLOCK",
    src: b.src,
    type: "audio/mpeg"
  }));
}

const PORT = parseInt(process.env.PORT || "4000", 10);
const server = app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});

// Ignore client-side connection resets (browser cancels, hot reload, etc.)
server.on('clientError', (err: NodeJS.ErrnoException, socket) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
    // client hung up, just destroy the socket quietly
    if (!socket.destroyed) socket.destroy();
    return;
  }

  console.error('clientError', err);
  try {
    if (!socket.destroyed) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  } catch {
    // ignore
  }
});

// Also ignore low-level server ECONNRESET/EPIPE
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
    return;
  }
  console.error('server error', err);
});

// Optional: last-resort guard so ECONNRESET doesn’t crash the process
process.on('uncaughtException', (err: any) => {
  if (err && (err.code === 'ECONNRESET' || err.code === 'EPIPE')) {
    return;
  }
  console.error('uncaughtException', err);
});

import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
console.log('[backend] connecting to Redis at', redisUrl);

const redis = new IORedis(redisUrl);

redis.on('ready', () => {
  console.log('[backend] Redis connected');
});

redis.on('error', (err) => {
  console.error('[backend] Redis error:', err);
});
