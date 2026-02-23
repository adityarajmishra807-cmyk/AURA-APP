import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImagePlus, Video, Upload, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreateStoryDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, caption?: string) => Promise<boolean>;
}

export function CreateStoryDialog({ open, onClose, onUpload }: CreateStoryDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const isVideo = f.type.startsWith("video");
    const maxSize = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024;

    if (f.size > maxSize) {
      toast.error(isVideo ? "Video must be under 15MB" : "Image must be under 5MB");
      return;
    }

    setFile(f);
    setMediaType(isVideo ? "video" : "image");
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Select an image or video first");
      return;
    }
    setUploading(true);
    const success = await onUpload(file, caption.trim() || undefined);
    setUploading(false);
    if (success) {
      toast.success("Story posted!");
      handleReset();
      onClose();
    } else {
      toast.error("Failed to post story");
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setMediaType("image");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-[#0B0B1F]/95 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-sm rounded-3xl bg-card/90 border border-border/20 backdrop-blur-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/10">
            <h3 className="text-foreground font-display font-semibold text-lg">New Story</h3>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {!preview ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="aspect-[9/16] max-h-[50vh] rounded-2xl border-2 border-dashed border-border/30 bg-muted/20 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-foreground text-sm font-medium">Upload media</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Image or video (max 15s)</p>
                </div>
              </div>
            ) : (
              <div className="relative aspect-[9/16] max-h-[50vh] rounded-2xl overflow-hidden bg-black">
                {mediaType === "video" ? (
                  <video src={preview} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                )}
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Caption */}
            <div className="relative">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/20 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/30 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                {caption.length}/100
              </span>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="w-full gradient-primary text-primary-foreground font-semibold h-12 rounded-xl glow-sm"
            >
              {uploading ? (
                <span className="animate-pulse">Posting...</span>
              ) : (
                "Share Story"
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
