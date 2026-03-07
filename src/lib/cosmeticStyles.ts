/**
 * Cosmetic Style Fallback Renderer
 *
 * Converts Tailwind-class-based cosmetic strings (stored in DB) into
 * reliable inline styles so cosmetics always render even when classes
 * are purged by the build system.
 */

// ── Tailwind color map (subset used by shop items) ──────────────────────
const COLOR_MAP: Record<string, string> = {
  // reds
  "red-400": "#f87171",
  "red-500": "#ef4444",
  "red-950": "#450a0a",
  "rose-900": "#881337",
  // oranges
  "orange-400": "#fb923c",
  "orange-500": "#f97316",
  "orange-900": "#7c2d12",
  "orange-950": "#431407",
  // yellows / ambers
  "yellow-300": "#fde047",
  "yellow-400": "#facc15",
  "yellow-900": "#713f12",
  "amber-400": "#fbbf24",
  "amber-500": "#f59e0b",
  "amber-950": "#451a03",
  // greens
  "green-400": "#4ade80",
  "green-900": "#14532d",
  "emerald-400": "#34d399",
  "emerald-950": "#022c22",
  // teals / cyans
  "teal-400": "#2dd4bf",
  "teal-900": "#134e4a",
  "cyan-400": "#22d3ee",
  "cyan-950": "#083344",
  // blues
  "blue-300": "#93c5fd",
  "blue-400": "#60a5fa",
  "blue-900": "#1e3a5e",
  "blue-950": "#172554",
  // sky
  "sky-300": "#7dd3fc",
  // indigos
  "indigo-950": "#1e1b4b",
  // purples / violets
  "purple-400": "#c084fc",
  "purple-900": "#581c87",
  "violet-500": "#8b5cf6",
  "violet-900": "#4c1d95",
  // pinks / fuchsias
  "pink-300": "#f9a8d4",
  "pink-400": "#f472b6",
  "pink-950": "#500724",
  "fuchsia-950": "#4a044e",
  // neutrals
  "slate-300": "#cbd5e1",
  "slate-900": "#0f172a",
  "slate-950": "#020617",
  "gray-950": "#030712",
  "zinc-950": "#09090b",
  black: "#000000",
  white: "#ffffff",
};

function resolveColor(name: string): string {
  return COLOR_MAP[name] || name;
}

// ── Gradient direction map ──────────────────────────────────────────────
const GRADIENT_DIR: Record<string, string> = {
  "bg-gradient-to-r": "to right",
  "bg-gradient-to-br": "to bottom right",
  "bg-gradient-to-b": "to bottom",
  "bg-gradient-to-l": "to left",
  "bg-gradient-to-t": "to top",
  "bg-gradient-to-tr": "to top right",
  "bg-gradient-to-bl": "to bottom left",
  "bg-gradient-to-tl": "to top left",
};

export interface CosmeticStyleResult {
  className: string;   // classes safe to keep (non-colour utility like rounded, etc.)
  style: React.CSSProperties;
}

/**
 * Parse a cosmetic preview_value string (Tailwind classes from DB) and
 * return both a safe className string AND inline styles that guarantee
 * visual rendering regardless of Tailwind purging.
 */
export function parseCosmeticStyles(previewValue?: string | null): CosmeticStyleResult {
  if (!previewValue) return { className: "", style: {} };

  const classes = previewValue.trim().split(/\s+/);
  const style: React.CSSProperties = {};
  const keep: string[] = []; // classes we pass through

  let gradientDir: string | null = null;
  let fromColor: string | null = null;
  let viaColor: string | null = null;
  let toColor: string | null = null;
  let isTextTransparent = false;
  let isBgClipText = false;

  for (const cls of classes) {
    // Gradient direction
    if (GRADIENT_DIR[cls]) {
      gradientDir = GRADIENT_DIR[cls];
      continue;
    }

    // Gradient stops
    const fromMatch = cls.match(/^from-(.+)$/);
    if (fromMatch) { fromColor = resolveColor(fromMatch[1]); continue; }

    const viaMatch = cls.match(/^via-(.+)$/);
    if (viaMatch) { viaColor = resolveColor(viaMatch[1]); continue; }

    const toMatch = cls.match(/^to-(.+)$/);
    if (toMatch) { toColor = resolveColor(toMatch[1]); continue; }

    // Text colour (solid)
    const textMatch = cls.match(/^text-([\w-]+)$/);
    if (textMatch && textMatch[1] !== "transparent") {
      const c = resolveColor(textMatch[1]);
      if (c.startsWith("#")) {
        style.color = c;
        continue;
      }
    }

    if (cls === "text-transparent") { isTextTransparent = true; continue; }
    if (cls === "bg-clip-text") { isBgClipText = true; continue; }

    // Ring (border-like glow around avatars)
    if (cls === "ring-2") { style.boxShadow = (style.boxShadow ? style.boxShadow + ", " : "") + "0 0 0 2px var(--ring-color, hsl(var(--primary)))"; continue; }
    if (cls === "ring-[3px]") { style.boxShadow = (style.boxShadow ? style.boxShadow + ", " : "") + "0 0 0 3px var(--ring-color, hsl(var(--primary)))"; continue; }

    const ringColorMatch = cls.match(/^ring-([\w-]+)$/);
    if (ringColorMatch) {
      const c = resolveColor(ringColorMatch[1]);
      if (c.startsWith("#")) {
        (style as any)["--ring-color"] = c;
        continue;
      }
    }

    // Shadow
    const shadowMatch = cls.match(/^shadow-\[(.+)\]$/);
    if (shadowMatch) {
      const val = shadowMatch[1].replace(/_/g, " ");
      style.boxShadow = style.boxShadow ? `${style.boxShadow}, ${val}` : val;
      continue;
    }

    // Keep anything else (rounded, etc.)
    keep.push(cls);
  }

  // Build gradient
  if (gradientDir && fromColor) {
    const stops: string[] = [fromColor];
    if (viaColor) stops.push(viaColor);
    if (toColor) stops.push(toColor);
    const grad = `linear-gradient(${gradientDir}, ${stops.join(", ")})`;
    style.background = grad;
  }

  // Transparent text for gradient text effect
  if (isTextTransparent || isBgClipText) {
    (style as any).WebkitTextFillColor = "transparent";
    (style as any).WebkitBackgroundClip = "text";
    (style as any).backgroundClip = "text";
  }

  return { className: keep.join(" "), style };
}

/**
 * Convenience: merge a base class string with cosmetic preview_value,
 * returning props ready to spread onto an element.
 *
 * Usage:
 *   const { className, style } = cosmeticProps("w-10 h-10 rounded-full", framePreview);
 *   <Avatar className={className} style={style} />
 */
export function cosmeticProps(
  baseClass: string,
  previewValue?: string | null
): { className: string; style: React.CSSProperties } {
  const parsed = parseCosmeticStyles(previewValue);
  return {
    className: `${baseClass} ${parsed.className}`.trim(),
    style: parsed.style,
  };
}

/**
 * For text elements that use gradient name colours.
 */
export function nameColorProps(
  baseClass: string,
  nameColor?: string | null
): { className: string; style: React.CSSProperties } {
  return cosmeticProps(baseClass, nameColor);
}
