import { motion } from "framer-motion";

interface Props {
  username?: string;
  avatarUrl?: string | null;
}

export function TypingIndicator({ username, avatarUrl }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-end gap-2 mb-2.5"
    >
      {/* Avatar */}
      <div className="w-7 h-7 shrink-0">
        <div className="w-7 h-7 rounded-full overflow-hidden border border-border/20">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] font-bold">
              {username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-start">
        <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase mb-1 px-1.5">
          {username}
        </span>
        <div className="px-4 py-3 rounded-[18px] bg-card/70 backdrop-blur-md border border-border/25 shadow-[0_1px_8px_hsl(var(--background)/0.3)]">
          <div className="flex items-center gap-[5px]">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-[7px] h-[7px] rounded-full bg-muted-foreground/60"
                animate={{
                  y: [0, -5, 0],
                  opacity: [0.4, 1, 0.4],
                  scale: [0.85, 1.15, 0.85],
                }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
