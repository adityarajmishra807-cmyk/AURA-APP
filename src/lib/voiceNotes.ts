const AUDIO_MIME_CANDIDATES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

const MIME_EXTENSION_MAP: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/webm;codecs=opus": "webm",
  "audio/webm": "webm",
  "audio/ogg;codecs=opus": "ogg",
  "audio/ogg": "ogg",
};

export interface VoiceNotePayload {
  label: string;
  url: string;
  mimeType?: string;
}

export function getSupportedVoiceNoteMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return { mimeType: "audio/webm", extension: "webm" };
  }

  const mimeType = AUDIO_MIME_CANDIDATES.find((candidate) => {
    if (typeof MediaRecorder.isTypeSupported !== "function") {
      return candidate === "audio/mp4";
    }

    return MediaRecorder.isTypeSupported(candidate);
  }) || "audio/webm";

  return {
    mimeType,
    extension: MIME_EXTENSION_MAP[mimeType] || "webm",
  };
}

export function buildVoiceMessageContent(url: string, mimeType?: string) {
  return [`🎤 Voice message`, url, mimeType].filter(Boolean).join("\n");
}

export function parseVoiceMessageContent(content: string): VoiceNotePayload | null {
  if (!content.startsWith("🎤 Voice message\n")) return null;

  const [, url = "", mimeType] = content.split("\n");
  if (!url) return null;

  return {
    label: "🎤 Voice message",
    url,
    mimeType: mimeType || undefined,
  };
}