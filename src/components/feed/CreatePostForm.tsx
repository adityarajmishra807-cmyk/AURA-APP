import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Send, X, Coins, Video, Mic } from "lucide-react";
import { toast } from "sonner";

interface CreatePostFormProps {
  onPostCreated: () => void;
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const { user, refreshProfile } = useAuth();
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "audio") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = type === "video" ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(type === "video" ? "Video must be under 20MB" : "File must be under 5MB");
      return;
    }
    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Write something first!");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    let imageUrl: string | null = null;

    // Upload media if present
    if (mediaFile) {
      const ext = mediaFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, mediaFile);

      if (uploadError) {
        toast.error("Upload failed");
        setSubmitting(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
      imageUrl = publicUrl;
    }

    // Create post
    const { data: post, error } = await supabase
      .from("posts")
      .insert({ user_id: user.id, content: content.trim(), image_url: imageUrl })
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to create post");
      setSubmitting(false);
      return;
    }

    // Claim daily post reward
    const { data: rewardResult } = await supabase.rpc("claim_post_reward", {
      p_post_id: post.id,
    });

    const reward = rewardResult as any;
    if (reward?.success) {
      toast.success("Post created! +10 AURIX daily reward 🎉");
      await refreshProfile();
    } else {
      toast.success("Post created!");
    }

    setContent("");
    removeMedia();
    setIsFocused(false);
    onPostCreated();
    setSubmitting(false);
  };

  const isExpanded = isFocused || content.length > 0 || mediaPreview;

  return (
    <motion.div
      className="glass-card rounded-2xl p-4 md:p-6"
      animate={{ height: "auto" }}
      transition={{ duration: 0.2 }}
    >
      <Textarea
        ref={textareaRef}
        placeholder="What's on your mind? Share your aura..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          if (!content.trim() && !mediaPreview) setIsFocused(false);
        }}
        maxLength={500}
        className="bg-muted/30 border-border/30 focus:border-primary resize-none text-base min-h-[48px] md:min-h-[100px] transition-all duration-200"
        rows={isExpanded ? 3 : 1}
      />

      <AnimatePresence>
        {mediaPreview && (
          <motion.div
            className="relative mt-3 inline-block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {mediaType === "image" && (
              <img
                src={mediaPreview}
                alt="Preview"
                className="max-h-36 md:max-h-48 rounded-xl border border-border/50 object-cover"
              />
            )}
            {mediaType === "video" && (
              <video
                src={mediaPreview}
                controls
                className="max-h-36 md:max-h-48 rounded-xl border border-border/50"
              />
            )}
            {mediaType === "audio" && (
              <audio src={mediaPreview} controls className="w-full" />
            )}
            <button
              onClick={removeMedia}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center tap-target"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            className="flex items-center justify-between mt-3 md:mt-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-1">
              <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50 tap-target tap-scale">
                <ImagePlus className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaSelect(e, "image")} />
              </label>
              <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50 tap-target tap-scale">
                <Video className="w-5 h-5" />
                <input type="file" accept="video/*" className="hidden" onChange={(e) => handleMediaSelect(e, "video")} />
              </label>
              <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50 tap-target tap-scale">
                <Mic className="w-5 h-5" />
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleMediaSelect(e, "audio")} />
              </label>
              <span className="text-xs text-muted-foreground ml-1">{content.length}/500</span>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Coins className="w-3 h-3 text-aura-gold" />
                <span>+10 first post/day</span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !content.trim()}
                className="gradient-primary text-primary-foreground glow-sm tap-scale"
                size="sm"
              >
                {submitting ? "Posting..." : (
                  <>
                    Post <Send className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="flex items-center justify-between mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Coins className="w-3 h-3 text-aura-gold" />
              <span>+10 first post/day</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
