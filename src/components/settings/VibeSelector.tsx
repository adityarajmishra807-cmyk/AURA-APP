import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const VIBES = [
  { id: "dominant", emoji: "🔥", label: "Dominant", color: "from-red-500/30 to-orange-500/30 border-red-500/40" },
  { id: "intellectual", emoji: "🧠", label: "Intellectual", color: "from-blue-500/30 to-cyan-500/30 border-blue-500/40" },
  { id: "creative", emoji: "🎨", label: "Creative", color: "from-pink-500/30 to-purple-500/30 border-pink-500/40" },
  { id: "chaotic", emoji: "⚡", label: "Chaotic", color: "from-yellow-500/30 to-amber-500/30 border-yellow-500/40" },
  { id: "mystic", emoji: "🌙", label: "Mystic", color: "from-indigo-500/30 to-violet-500/30 border-indigo-500/40" },
  { id: "chill", emoji: "🧊", label: "Chill", color: "from-teal-500/30 to-emerald-500/30 border-teal-500/40" },
];

interface VibeSelectorProps {
  selected: string[];
  onChange: (vibes: string[]) => void;
}

export function VibeSelector({ selected, onChange }: VibeSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((v) => v !== id));
    } else if (selected.length < 3) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Your Vibe
        </Label>
        <span className="text-[11px] text-muted-foreground/60">{selected.length}/3</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {VIBES.map((vibe) => {
          const isSelected = selected.includes(vibe.id);
          return (
            <motion.button
              key={vibe.id}
              type="button"
              onClick={() => toggle(vibe.id)}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              className={cn(
                "px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all duration-300 select-none",
                isSelected
                  ? `bg-gradient-to-r ${vibe.color} text-foreground shadow-lg shadow-purple-500/10`
                  : "bg-background/30 border-border/30 text-muted-foreground hover:border-border/60"
              )}
            >
              <span className="mr-1">{vibe.emoji}</span>
              {vibe.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
