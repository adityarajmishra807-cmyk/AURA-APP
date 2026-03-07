import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  otherUser: any;
  energy: "calm" | "active" | "intense";
}

export function AmbientBackground({ otherUser, energy }: Props) {
  const { profile } = useAuth();

  const sameCollege = profile?.college_id && otherUser?.college_id && profile.college_id === otherUser.college_id;
  const highAurix = (profile?.aurix_balance || 0) + (otherUser?.aurix_balance || 0) > 3000;

  const speed = energy === "intense" ? 6 : energy === "active" ? 12 : 22;
  const orbOpacity = energy === "intense" ? 0.08 : energy === "active" ? 0.06 : 0.04;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Primary orb */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "50%",
          height: "50%",
          top: "10%",
          left: "20%",
          background: sameCollege
            ? `radial-gradient(circle, hsl(265 80% 65% / ${orbOpacity}) 0%, transparent 70%)`
            : `radial-gradient(circle, hsl(265 70% 60% / ${orbOpacity}) 0%, transparent 70%)`,
        }}
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{ duration: speed, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Secondary orb */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "40%",
          height: "40%",
          bottom: "15%",
          right: "10%",
          background: `radial-gradient(circle, hsl(330 60% 55% / ${orbOpacity * 0.8}) 0%, transparent 70%)`,
        }}
        animate={{
          x: [0, -25, 35, 0],
          y: [0, 25, -15, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{ duration: speed * 1.3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Gold accent orb for high AURIX convos */}
      {highAurix && (
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{
            width: "30%",
            height: "30%",
            top: "40%",
            left: "50%",
            background: `radial-gradient(circle, hsl(42 90% 60% / ${orbOpacity * 0.6}) 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 20, -20, 0],
            y: [0, -15, 10, 0],
          }}
          transition={{ duration: speed * 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />
    </div>
  );
}
