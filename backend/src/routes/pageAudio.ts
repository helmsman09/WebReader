// backend/src/routes/pageAudio.ts
import express from "express";
import { PageAudioModel } from "../models/PageAudio";
import { requireUser } from "../middleware/requireUser";

const router = express.Router();

// PATCH /api/pages/:pageId/audio/:audioId
router.patch(
  "/api/pages/:pageId/audio/:audioId",
  requireUser,
  async (req, res, next) => {
    try {
      const { pageId, audioId } = req.params;
      const { chunks } = req.body; // new chunk timings

      if (!Array.isArray(chunks)) {
        return res.status(400).json({ error: "chunks must be an array" });
      }

      const doc = await PageAudioModel.findOne({
        _id: audioId,
        pageId,
      });

      if (!doc) {
        return res.status(404).json({ error: "audio not found" });
      }

      // trust only start/end and maybe text; keep wordIndices as-is
      doc.chunks = chunks.map((c: any) => ({
        ...c,
        start: typeof c.start === "number" ? c.start : null,
        end: typeof c.end === "number" ? c.end : null,
      }));
      await doc.save();

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/api/pages/:id/audio", async (req, res, next) => {
  try {
    const pageId = req.params.id;
    const doc = await PageAudioModel.findOne({ pageId }).lean().exec();
    if (!doc) {
      return res.status(404).json({ error: "No audio for this page" });
    }

    res.json({
      id: doc._id.toString(),
      pageId: doc.pageId.toString(),
      audioUrl: doc.audioUrl,
      voiceId: doc.voiceId,
      durationSec: doc.durationMs ? doc.durationMs / 1000 : undefined,
      text: doc.text,
      words: doc.words,
      chunks: doc.chunks,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
