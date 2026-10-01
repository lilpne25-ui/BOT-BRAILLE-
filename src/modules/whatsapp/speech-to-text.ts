type TranscribeOptions = {
  language?: string;
};

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";

function mimeTypeToExtension(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base.includes("ogg")) return "ogg";
  if (base.includes("mpeg") || base.includes("mp3")) return "mp3";
  if (base.includes("mp4") || base.includes("m4a")) return "m4a";
  if (base.includes("wav")) return "wav";
  if (base.includes("webm")) return "webm";
  return "ogg";
}

export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string,
  options?: TranscribeOptions
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!buffer || buffer.length === 0) return null;

  const model = process.env.OPENAI_STT_MODEL?.trim() || "whisper-1";
  const language = options?.language ?? process.env.OPENAI_STT_LANGUAGE?.trim() ?? "es";
  const extension = mimeTypeToExtension(mimeType);

  try {
    const form = new FormData();
    form.append("model", model);
    if (language) form.append("language", language);
    form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType || "audio/ogg" }), `audio.${extension}`);

    const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: form
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { text?: string };
    const text = data.text?.trim();
    return text ? text : null;
  } catch {
    return null;
  }
}
