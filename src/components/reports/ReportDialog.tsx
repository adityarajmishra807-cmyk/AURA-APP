import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag, ShieldAlert, MessageSquareWarning, Skull, Ban, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: "post" | "comment" | "message" | "profile";
  contentId: string;
  reportedUserId: string;
}

const REASONS = [
  { key: "inappropriate", label: "Inappropriate Content", icon: Ban, description: "Nudity, sexual content, or offensive material" },
  { key: "spam", label: "Spam", icon: MessageSquareWarning, description: "Repetitive, misleading, or promotional content" },
  { key: "harassment", label: "Harassment / Bullying", icon: ShieldAlert, description: "Targeting, intimidating, or threatening someone" },
  { key: "hate_speech", label: "Hate Speech", icon: Skull, description: "Racism, sexism, or discrimination" },
  { key: "violence", label: "Violence / Threats", icon: AlertTriangle, description: "Threats, self-harm, or dangerous content" },
  { key: "other", label: "Other", icon: Flag, description: "Something else not listed above" },
] as const;

export function ReportDialog({ open, onOpenChange, contentType, contentId, reportedUserId }: ReportDialogProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedReason) return;
    setSubmitting(true);

    const { error } = await supabase.from("reports" as any).insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      reported_user_id: reportedUserId,
      reason: selectedReason,
      description: description.trim() || null,
    } as any);

    if (error) {
      if (error.code === "23505") {
        toast.info("You've already reported this content");
      } else {
        toast.error("Failed to submit report");
      }
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSelectedReason(null);
      setDescription("");
      setSubmitted(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Flag className="w-5 h-5 text-destructive" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Help us keep Aura safe. Reports are anonymous and confidential.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto"
              >
                <ShieldAlert className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="text-lg font-bold text-foreground">Report Submitted</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Thank you for helping keep Aura safe. We'll review this content and take action if it violates our guidelines.
              </p>
              <Button onClick={handleClose} className="mt-2">Done</Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Why are you reporting this?</p>
                <div className="grid gap-2">
                  {REASONS.map((reason) => (
                    <motion.button
                      key={reason.key}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedReason(reason.key)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedReason === reason.key
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/30 bg-background/50 hover:border-border/60"
                      }`}
                    >
                      <reason.icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                        selectedReason === reason.key ? "text-primary" : "text-muted-foreground"
                      }`} />
                      <div>
                        <p className={`text-sm font-medium ${
                          selectedReason === reason.key ? "text-primary" : "text-foreground"
                        }`}>{reason.label}</p>
                        <p className="text-xs text-muted-foreground">{reason.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {selectedReason && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  <p className="text-sm font-medium text-foreground">Additional details (optional)</p>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                    placeholder="Tell us more about why you're reporting this..."
                    className="bg-background/50 border-border/30 resize-none h-20"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
                </motion.div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedReason || submitting}
                  className="flex-1 bg-destructive hover:bg-destructive/90"
                >
                  {submitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
