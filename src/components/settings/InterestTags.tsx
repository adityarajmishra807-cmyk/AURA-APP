import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = ["coding", "gym", "startups", "gaming", "music", "art", "travel", "anime", "crypto", "fashion", "reading", "photography"];

interface InterestTagsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function InterestTags({ tags, onChange }: InterestTagsProps) {
  const [input, setInput] = useState("");

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      onChange([...tags, t]);
      setInput("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
  };

  const suggestions = SUGGESTIONS.filter((s) => !tags.includes(s));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Interests
        </Label>
        <span className="text-[11px] text-muted-foreground/60">{tags.length}/10</span>
      </div>

      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        <AnimatePresence mode="popLayout">
          {tags.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/25 text-xs font-medium text-purple-300"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-pink-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      {tags.length < 10 && (
        <div className="relative group">
          <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type & press enter..."
            className="relative bg-background/50 border-border/30 focus:border-purple-500/50 text-foreground text-sm"
          />
        </div>
      )}

      {/* Quick suggestions */}
      {suggestions.length > 0 && tags.length < 10 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/20 text-[11px] text-muted-foreground/60 hover:border-purple-500/30 hover:text-purple-400 transition-all"
            >
              <Plus className="w-2.5 h-2.5" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
