import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Send, X, Coins } from "lucide-react";
import { toast } from "sonner";

interface CreatePostFormProps {
  onPostCreated: () => void;
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const { user, refreshProfile } = useAuth();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Write something first!");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    let imageUrl: string | null = null;

    // Upload image if present
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, imageFile);

      if (uploadError) {
        toast.error("Image upload failed");
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
    setImageFile(null);
    setImagePreview(null);
    onPostCreated();
    setSubmitting(false);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <Textarea
        placeholder="What's on your mind? Share your aura..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        className="bg-muted/30 border-border/30 focus:border-primary resize-none min-h-[100px] text-base"
        rows={3}
      />

      {imagePreview && (
        <div className="relative mt-3 inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-48 rounded-xl border border-border/50 object-cover"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50">
            <ImagePlus className="w-5 h-5" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </label>
          <span className="text-xs text-muted-foreground">{content.length}/500</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Coins className="w-3 h-3 text-aura-gold" />
            <span>+10 first post/day</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="gradient-primary text-primary-foreground glow-sm"
            size="sm"
          >
            {submitting ? "Posting..." : (
              <>
                Post <Send className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
