import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES = [
  { label: "😀", emojis: ["😀","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳","😏","😌","🤔","🤫","🤭","😤","😡","🥺","😢","😭","😱","🤯","😈","💀","👻","🤡","💩"] },
  { label: "👋", emojis: ["👋","👍","👎","👏","🙌","🤝","✌️","🤞","🤙","💪","🫶","❤️","🧡","💛","💚","💙","💜","🖤","🤍","💯","🔥","⭐","✨","💫","🎉","🎊","🏆"] },
  { label: "🐱", emojis: ["🐱","🐶","🦊","🐻","🐼","🐸","🐵","🦁","🐯","🐮","🐷","🐔","🐧","🐦","🦅","🦋","🐝","🌸","🌺","🌻","🌹","🌙","☀️","🌈","⚡","❄️","💧"] },
  { label: "🍕", emojis: ["🍕","🍔","🍟","🌮","🍿","🍩","🍰","🧁","🍫","🍪","☕","🧃","🍷","🍺","🥤","🎂","🍭","🍬","🧀","🥑","🍌","🍎","🍊","🍋","🍇","🍉","🥝"] },
  { label: "⚽", emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🎮","🕹️","🎯","🎲","🧩","🎭","🎨","🎬","🎤","🎧","🎵","🎶","💿","📱","💻","⌨️","🖥️","📷","💡","🔮","💎"] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, isOpen, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-1 mb-2 w-72 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/30 shadow-xl shadow-black/20 z-50 overflow-hidden"
        >
          {/* Category tabs */}
          <div className="flex border-b border-border/20 px-1 pt-1">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(i)}
                className={cn(
                  "flex-1 py-1.5 text-base rounded-t-lg transition-colors",
                  activeCategory === i ? "bg-muted/50" : "hover:bg-muted/30"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="p-2 h-48 overflow-y-auto scrollbar-none">
            <div className="grid grid-cols-7 gap-0.5">
              {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onSelect(emoji); onClose(); }}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-muted/50 active:scale-90 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
