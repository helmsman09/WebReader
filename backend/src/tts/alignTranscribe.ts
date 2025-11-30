// src/tts/alignTranscribe.ts
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { openai } from "./openaiClient";
import type { AlignmentResult } from "./index"; // your align/index.ts types
import { buildAlignmentResult } from "./index";

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  words?: WhisperWord[];
}

/**
 * Given the TTS audio buffer and original text, transcribe + align.
 */
export async function transcribeAndAlignTtsAudio(params: {
  audioBuffer: Buffer;
  originalText: string;
}): Promise<AlignmentResult> {
  const { audioBuffer, originalText } = params;

  // 1) write buffer to a temp file
  const tmpDir = os.tmpdir();
  const tmpPath = path.join(tmpDir, `tts-${Date.now()}-${Math.random()}.mp3`);

  await writeFile(tmpPath, audioBuffer);

  try {
    // 2) create a read stream for OpenAI
    const fileStream = fs.createReadStream(tmpPath);

    const resp = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe", // or appropriate model
      file: fileStream as any,         // Node stream; SDK expects a file-like
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    // `resp` type depends on SDK; assume it has `text` and `segments`
    const segments = (resp as any).segments as WhisperSegment[] | undefined;
    if (!segments) {
      throw new Error("Transcription response missing segments");
    }

    // 3) build alignment (words + chunks)
    const alignment = buildAlignmentResult({
      originalText,
      segments,
    });

    return alignment;
  } finally {
    // 4) cleanup temp file
    try {
      await unlink(tmpPath);
    } catch {
      // ignore
    }
  }
}
