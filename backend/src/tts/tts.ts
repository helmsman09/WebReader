import { openai } from "./openaiClient";
import { uploadTtsMp3 } from "../aws/s3";

export async function generateTtsMp3ForText(params: {
  userId: string;
  text: string;
  voiceId: string;
}) {
  const { userId, text, voiceId } = params;

  const resp = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: voiceId,
    input: text,
  });

  // @ts-ignore: Response type is not yet great
  const arrayBuffer = await resp.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  const {audioUrl} = await uploadTtsMp3(userId, audioBuffer);
  return { audioBuffer, audioUrl};
}