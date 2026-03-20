import { motion } from "framer-motion";
import { Flame, Trophy, Zap } from "lucide-react";

interface StatCardsProps {
  aurixBalance: number;
  streakCount: number;
  rank?: number | null;
  collegeName?: string;
}

const cards = [
  { key: "level", icon: Zap, gradient: "from-purple-500/20 to-indigo-500/20", iconColor: "text-purple-400", borderColor: "border-purple-500/20" },
  { key: "streak", icon: Flame, gradient: "from-orange-500/20 to-red-500/20", iconColor: "text-orange-400", borderColor: "border-orange-500/20" },
  { key: "rank", icon: Trophy, gradient: "from-amber-500/20 to-yellow-500/20", iconColor: "text-amber-400", borderColor: "border-amber-500/20" },
];

export function StatCards({ aurixBalance, streakCount, rank, collegeName }: StatCardsProps) {
  const level = Math.floor(Math.sqrt(aurixBalance / 10)) + 1;

  const values = [
    { label: "Aura Level", value: `Lv. ${level} ⚡`, sub: `${aurixBalance.toLocaleString()} AURIX` },
    { label: "Streak", value: `🔥 ${streakCount} days`, sub: "Keep it going!" },
    { label: "Rank", value: rank ? `🏆 #${rank}` : "—", sub: collegeName || "Global" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 300 }}
          whileHover={{ scale: 1.04, y: -2 }}
          className={`relative rounded-xl border ${card.borderColor} bg-gradient-to-br ${card.gradient} p-3 text-center overflow-hidden group cursor-default`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <card.icon className={`w-4 h-4 mx-auto mb-1.5 ${card.iconColor}`} />
          <p className="text-xs font-bold text-foreground">{values[i].value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{values[i].sub}</p>
        </motion.div>
      ))}
    </div>
  );
}
