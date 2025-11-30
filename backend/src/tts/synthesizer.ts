import type { TtsVoiceProfile } from "@news-capture/types";
import OpenAI from "openai";
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function synthesizeTts(
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