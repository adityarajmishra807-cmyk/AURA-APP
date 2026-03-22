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
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: "image" | "video" | "audio" }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "audio") => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 5 - mediaFiles.length;
    if (remaining <= 0) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    const toAdd = files.slice(0, remaining);
    const maxSize = type === "video" ? 20 * 1024 * 1024 : 5 * 1024 * 1024;

    const validFiles: File[] = [];
    const validPreviews: { url: string; type: "image" | "video" | "audio" }[] = [];

    for (const file of toAdd) {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large`);
        continue;
      }
      validFiles.push(file);
      validPreviews.push({ url: URL.createObjectURL(file), type });
    }

    setMediaFiles((prev) => [...prev, ...validFiles]);
    setMediaPreviews((prev) => [...prev, ...validPreviews]);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAllMedia = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFiles.length) {
      toast.error("Add some text or media first!");
      return;
    }
    if (!user) return;

    // Profanity check
    const profanityError = validateContent(content);
    if (profanityError) {
      toast.error(profanityError);
      return;
    }

    setSubmitting(true);
    let primaryImageUrl: string | null = null;

    // Upload first file as primary image_url for backwards compat
    if (mediaFiles.length > 0) {
      const file = mediaFiles[0];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, file);

      if (uploadError) {
        toast.error("Upload failed");
        setSubmitting(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
      primaryImageUrl = publicUrl;
    }

    // Create post
    const { data: post, error } = await supabase
      .from("posts")
      .insert({ user_id: user.id, content: content.trim() || "📸", image_url: primaryImageUrl })
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to create post");
      setSubmitting(false);
      return;
    }

    // Upload additional media files (index 1+) to post_media
    if (mediaFiles.length > 1) {
      // Also insert the first file into post_media for carousel consistency
      const mediaInserts: { post_id: string; media_url: string; media_type: string; position: number }[] = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        let url: string;
        if (i === 0) {
          url = primaryImageUrl!;
        } else {
          const file = mediaFiles[i];
          const ext = file.name.split(".").pop();
          const path = `${user.id}/${Date.now()}_${i}.${ext}`;
          const { error: upErr } = await supabase.storage.from("post-images").upload(path, file);
          if (upErr) continue;
          const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
          url = publicUrl;
        }

        const mType = mediaPreviews[i]?.type || "image";
        mediaInserts.push({ post_id: post.id, media_url: url, media_type: mType, position: i });
      }

      if (mediaInserts.length) {
        await supabase.from("post_media").insert(mediaInserts);
      }
    }

    // Extract and store hashtags
    const hashtags = content.match(/#(\w+)/g);
    if (hashtags && hashtags.length > 0) {
      const uniqueTags = [...new Set(hashtags.map((h) => h.slice(1).toLowerCase()))];
      const tagInserts = uniqueTags.map((tag) => ({ post_id: post.id, hashtag: tag }));
      await supabase.from("post_hashtags").insert(tagInserts);
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
    removeAllMedia();
    setIsFocused(false);
    onPostCreated();
    setSubmitting(false);
  };

  const isExpanded = isFocused || content.length > 0 || mediaPreviews.length > 0;

  return (
    <motion.div
      className="glass-card rounded-2xl p-4 md:p-6"
      animate={{ height: "auto" }}
      transition={{ duration: 0.2 }}
    >
      <Textarea
        ref={textareaRef}
        placeholder="What's on your mind? Share your aura... Use #hashtags!"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          if (!content.trim() && !mediaPreviews.length) setIsFocused(false);
        }}
        maxLength={500}
        className="bg-muted/30 border-border/30 focus:border-primary resize-none text-base min-h-[48px] md:min-h-[100px] transition-all duration-200"
        rows={isExpanded ? 3 : 1}
      />

      <AnimatePresence>
        {mediaPreviews.length > 0 && (
          <motion.div
            className="flex gap-2 mt-3 overflow-x-auto no-scrollbar"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {mediaPreviews.map((preview, i) => (
              <div key={i} className="relative shrink-0">
                {preview.type === "image" && (
                  <img src={preview.url} alt="Preview" className="h-24 md:h-36 rounded-xl border border-border/50 object-cover" />
                )}
                {preview.type === "video" && (
                  <video src={preview.url} className="h-24 md:h-36 rounded-xl border border-border/50" />
                )}
                {preview.type === "audio" && (
                  <div className="h-24 md:h-36 w-40 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center">
                    <audio src={preview.url} controls className="w-32" />
                  </div>
                )}
                <button
                  onClick={() => removeMedia(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {mediaFiles.length < 5 && (
              <label className="shrink-0 h-24 md:h-36 w-20 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                <input type="file" accept="image/*,video/*" className="hidden" multiple onChange={(e) => handleMediaSelect(e, "image")} />
              </label>
            )}
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
                <input type="file" accept="image/*" className="hidden" multiple onChange={(e) => handleMediaSelect(e, "image")} />
              </label>
              <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50 tap-target tap-scale">
                <Video className="w-5 h-5" />
                <input type="file" accept="video/*" className="hidden" onChange={(e) => handleMediaSelect(e, "video")} />
              </label>
              <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50 tap-target tap-scale">
                <Mic className="w-5 h-5" />
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleMediaSelect(e, "audio")} />
              </label>
              <span className="text-xs text-muted-foreground ml-1">{content.length}/500{mediaFiles.length > 0 && ` · ${mediaFiles.length}/5 files`}</span>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Coins className="w-3 h-3 text-aura-gold" />
                <span>+10 first post/day</span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || (!content.trim() && !mediaFiles.length)}
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
