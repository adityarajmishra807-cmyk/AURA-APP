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

  // Colors based on context
  const color1 = sameCollege
    ? "hsl(265 80% 65% / 0.06)"
    : "hsl(265 80% 65% / 0.04)";
  const color2 = sameCollege
    ? "hsl(270 50% 72% / 0.05)"
    : "hsl(330 70% 60% / 0.04)";
  const goldTint = highAurix ? "hsl(42 90% 60% / 0.03)" : "transparent";

  const speed = energy === "intense" ? 8 : energy === "active" ? 15 : 25;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[300%] h-[300%] -top-[100%] -left-[100%]"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 15, 0],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          background: `radial-gradient(ellipse at 30% 40%, ${color1} 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, ${color2} 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, ${goldTint} 0%, transparent 50%)`,
        }}
      />
    </div>
  );
}
