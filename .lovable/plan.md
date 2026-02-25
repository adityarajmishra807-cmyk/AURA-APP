

## Plan: Rename "Like" to "Spark" with Yellow Heart + Sparkle

### Overview
Rebrand the like button from a red heart to a yellow "Spark" — a yellow heart icon with a sparkle particle effect when activated.

### Changes to `src/components/feed/PostLikeButton.tsx`

1. **Icon**: Replace the `Heart` icon from lucide-react with a custom yellow heart. Use lucide's `Sparkles` icon layered on top for the sparkle effect when sparked.

2. **Color scheme**: Change from red (`fill-red-500 / text-red-500`) to yellow/gold (`fill-yellow-400 / text-yellow-400`), using the existing `aura-gold` color token for hover states.

3. **Aria labels**: Update from "Like"/"Unlike" to "Spark"/"Unspark".

4. **Error toasts**: Update messages from "Failed to like" / "Failed to unlike" to "Failed to spark" / "Failed to unspark".

5. **Sparkle animation**: When sparked, show a brief sparkle burst using a small `Sparkles` icon that fades in/scales up alongside the heart, then fades out — achieved with Framer Motion `AnimatePresence`.

### Files
- **Modified**: `src/components/feed/PostLikeButton.tsx` — icon, colors, labels, sparkle effect

