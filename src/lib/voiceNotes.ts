const AUDIO_MIME_CANDIDATES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

const MIME_EXTENSION_MAP: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/webm;codecs=opus": "webm",
  "audio/webm": "webm",
  "audio/ogg;codecs=opus": "ogg",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
};

export interface VoiceNotePayload {
  label: string;
  url: string;
  mimeType?: string;
}

export function normalizeVoiceNoteMimeType(mimeType?: string) {
  const normalized = mimeType?.toLowerCase().trim();

  if (!normalized || normalized === "application/octet-stream") {
    return "audio/mp4";
  }

  if (normalized.startsWith("audio/mp4") || normalized.startsWith("video/mp4") || normalized.includes("m4a")) {
    return "audio/mp4";
  }

  if (normalized.startsWith("audio/webm")) {
    return normalized.includes("codecs") ? normalized : "audio/webm";
  }

  if (normalized.startsWith("audio/ogg")) {
    return normalized.includes("codecs") ? normalized : "audio/ogg";
  }

  if (normalized === "audio/mp3" || normalized.startsWith("audio/mpeg")) {
    return "audio/mpeg";
  }

  return normalized;
}

export function getVoiceNoteExtension(mimeType?: string) {
  const normalized = normalizeVoiceNoteMimeType(mimeType);
  return MIME_EXTENSION_MAP[normalized] || "m4a";
}

export function getSupportedVoiceNoteMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return { mimeType: "audio/mp4", extension: "m4a" };
  }

  const mimeType = AUDIO_MIME_CANDIDATES.find((candidate) => {
    if (typeof MediaRecorder.isTypeSupported !== "function") {
      return candidate === "audio/mp4";
    }

    return MediaRecorder.isTypeSupported(candidate);
  }) || "audio/mp4";

  const normalizedMimeType = normalizeVoiceNoteMimeType(mimeType);

  return {
    mimeType: normalizedMimeType,
    extension: getVoiceNoteExtension(normalizedMimeType),
  };
}

export function buildVoiceMessageContent(url: string, mimeType?: string) {
  return [`🎤 Voice message`, url, normalizeVoiceNoteMimeType(mimeType)].filter(Boolean).join("\n");
}

export function parseVoiceMessageContent(content: string): VoiceNotePayload | null {
  const normalizedContent = content.trim();
  const hasVoiceLabel = /^(🎤\s*)?voice message/i.test(normalizedContent);

  if (!hasVoiceLabel) return null;

  const lines = normalizedContent.split("\n").map((line) => line.trim()).filter(Boolean);
  const inlineUrlMatch = normalizedContent.match(/https?:\/\/\S+/i);
  const url = lines.find((line) => /^https?:\/\//i.test(line)) || inlineUrlMatch?.[0] || "";

  if (!url) return null;

  const mimeLine = lines.find((line) => {
    const lowerLine = line.toLowerCase();
    return !/^(🎤\s*)?voice message/i.test(lowerLine) && line !== url && !/^https?:\/\//i.test(line);
  });

  return {
    label: "🎤 Voice message",
    url,
    mimeType: mimeLine ? normalizeVoiceNoteMimeType(mimeLine) : undefined,
  };
}