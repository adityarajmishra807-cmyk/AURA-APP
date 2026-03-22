import { motion } from "framer-motion";

export function AuraLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Aura spinning rings */}
        <div className="relative w-20 h-20">
          {/* Outer ring — slow, purple */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "hsl(var(--primary))",
              borderRightColor: "hsl(var(--primary) / 0.3)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
          {/* Middle ring — medium, pink */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "hsl(280 80% 65%)",
              borderLeftColor: "hsl(280 80% 65% / 0.3)",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
          {/* Inner ring — fast, blue */}
          <motion.div
            className="absolute inset-4 rounded-full border-2 border-transparent"
            style={{
              borderBottomColor: "hsl(220 80% 65%)",
              borderRightColor: "hsl(220 80% 65% / 0.3)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
          {/* Center glow dot */}
          <motion.div
            className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-primary"
            style={{ boxShadow: "0 0 16px 4px hsl(var(--primary) / 0.5)" }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        {/* Text */}
        <motion.p
          className="text-muted-foreground text-sm font-medium tracking-wide"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {text}
        </motion.p>
      </div>
    </div>
  );
}
