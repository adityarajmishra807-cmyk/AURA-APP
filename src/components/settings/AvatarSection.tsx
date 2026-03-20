import { useState } from "react";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvatarSectionProps {
  avatarUrl: string | null;
  username?: string;
  userId?: string;
  equippedFrame?: string | null;
  onAvatarChange: (url: string) => void;
}

export function AvatarSection({ avatarUrl, username, userId, equippedFrame, onAvatarChange }: AvatarSectionProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = publicUrl + "?t=" + Date.now();
    onAvatarChange(newUrl);
    setUploading(false);
    toast.success("Avatar uploaded!");
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
    >
      <div className="relative group">
        {/* Animated glow ring */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 opacity-75 blur-sm group-hover:opacity-100 transition-opacity duration-500 animate-[spin_6s_linear_infinite]" />
        <div className="relative">
          <Avatar className="w-28 h-28 border-2 border-background ring-2 ring-purple-500/30">
            <AvatarImage src={avatarUrl || ""} className="object-cover" />
            <AvatarFallback className="bg-muted text-3xl font-display font-bold bg-gradient-to-br from-purple-900 to-indigo-900 text-purple-200">
              {username?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <label className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer">
            <Camera className="w-7 h-7 text-purple-300" />
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {uploading ? (
          <span className="text-purple-400 animate-pulse">Uploading...</span>
        ) : (
          "Tap to change avatar"
        )}
      </p>
      {equippedFrame && (
        <span className="text-[10px] text-purple-400/70 font-medium uppercase tracking-wider">
          Frame equipped
        </span>
      )}
    </motion.div>
  );
}
