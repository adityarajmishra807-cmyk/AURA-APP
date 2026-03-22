import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Star, Send, ChevronRight, ChevronLeft, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RATING_QUESTIONS = [
  { key: "q1_ease_of_use", text: "How easy is it to use the Aura app?", low: "Very difficult", high: "Very easy" },
  { key: "q2_design", text: "How visually appealing is the app design?", low: "Poor", high: "Excellent" },
  { key: "q3_performance", text: "How satisfied are you with the app's performance?", low: "Very slow", high: "Very fast" },
  { key: "q4_usefulness", text: "How useful do you find the features?", low: "Not useful", high: "Very useful" },
  { key: "q5_recommend", text: "How likely are you to recommend Aura?", low: "Not likely", high: "Very likely" },
];

const TEXT_QUESTIONS = [
  { key: "q6_like_most", text: "What do you like the most about Aura?" },
  { key: "q7_problems", text: "What problems or issues did you face?" },
  { key: "q8_missing_feature", text: "Which feature should be added?" },
  { key: "q9_improve_experience", text: "How can we improve your experience?" },
  { key: "q10_change_one_thing", text: "If you could change one thing, what would it be?" },
];

const ALL_QUESTIONS = [...RATING_QUESTIONS, ...TEXT_QUESTIONS];

export function FeedbackBot() {
  const { user, profile } = useAuth();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    if (!user || !profile) return;

    const checkEligibility = async () => {
      // Check if account is at least 24 hours old
      const createdAt = new Date(profile.created_at).getTime();
      const now = Date.now();
      if (now - createdAt < 24 * 60 * 60 * 1000) return;

      // Check if already submitted feedback
      const { count } = await supabase
        .from("app_feedback")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (count && count > 0) return;

      // Check if dismissed today
      const dismissed = localStorage.getItem(`feedback_dismissed_${user.id}`);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed);
        if (now - dismissedAt < 24 * 60 * 60 * 1000) return;
      }

      setShow(true);
    };

    const timer = setTimeout(checkEligibility, 3000);
    return () => clearTimeout(timer);
  }, [user, profile]);

  const handleDismiss = () => {
    if (user) localStorage.setItem(`feedback_dismissed_${user.id}`, Date.now().toString());
    setOpen(false);
    setShow(false);
  };

  const handleRating = (value: number) => {
    const key = ALL_QUESTIONS[step].key;
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setTimeout(() => setStep((s) => s + 1), 300);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    const key = ALL_QUESTIONS[step].key;
    setAnswers((prev) => ({ ...prev, [key]: textInput.trim() }));
    setTextInput("");
    if (step < ALL_QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      submitFeedback({ ...answers, [key]: textInput.trim() });
    }
  };

  const submitFeedback = async (finalAnswers: Record<string, number | string>) => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("app_feedback").insert({
      user_id: user.id,
      q1_ease_of_use: finalAnswers.q1_ease_of_use as number,
      q2_design: finalAnswers.q2_design as number,
      q3_performance: finalAnswers.q3_performance as number,
      q4_usefulness: finalAnswers.q4_usefulness as number,
      q5_recommend: finalAnswers.q5_recommend as number,
      q6_like_most: (finalAnswers.q6_like_most as string) || null,
      q7_problems: (finalAnswers.q7_problems as string) || null,
      q8_missing_feature: (finalAnswers.q8_missing_feature as string) || null,
      q9_improve_experience: (finalAnswers.q9_improve_experience as string) || null,
      q10_change_one_thing: (finalAnswers.q10_change_one_thing as string) || null,
    });

    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit feedback");
    } else {
      toast.success("Thanks for your feedback! 💜");
      setOpen(false);
      setShow(false);
    }
  };

  const isRatingStep = step < RATING_QUESTIONS.length;
  const currentQ = ALL_QUESTIONS[step];
  const progress = ((step) / ALL_QUESTIONS.length) * 100;

  if (!show) return null;

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "70vh" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border/20 bg-primary/5">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Aura Feedback</p>
                <p className="text-[11px] text-muted-foreground">Help us improve ✨</p>
              </div>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {step === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-muted/50 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-foreground"
                >
                  Hey {profile?.username}! 👋 I'd love to hear what you think about Aura. It'll only take a minute!
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  {/* Question bubble */}
                  <div className="bg-muted/50 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-foreground">
                    <span className="text-muted-foreground text-[11px] font-medium">Q{step + 1}/10</span>
                    <p className="mt-1 font-medium">{currentQ.text}</p>
                  </div>

                  {/* Rating input */}
                  {isRatingStep && (
                    <div className="space-y-2">
                      <div className="flex gap-2 justify-center">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <motion.button
                            key={v}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleRating(v)}
                            className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold transition-colors border",
                              answers[currentQ.key] === v
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border/30 text-foreground hover:border-primary/50"
                            )}
                          >
                            {v}
                          </motion.button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                        <span>{(currentQ as typeof RATING_QUESTIONS[0]).low}</span>
                        <span>{(currentQ as typeof RATING_QUESTIONS[0]).high}</span>
                      </div>
                    </div>
                  )}

                  {/* Text input */}
                  {!isRatingStep && (
                    <div className="flex gap-2">
                      <input
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                        placeholder="Type your answer..."
                        className="flex-1 bg-muted/50 border border-border/30 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        autoFocus
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim() || submitting}
                        className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                      >
                        {step === ALL_QUESTIONS.length - 1 ? (
                          <Send className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border/20 flex items-center justify-between">
              <button
                onClick={() => { setStep((s) => Math.max(0, s - 1)); setTextInput(""); }}
                disabled={step === 0}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
              <span className="text-[10px] text-muted-foreground">{step + 1} of 10</span>
              {!isRatingStep && step < ALL_QUESTIONS.length - 1 && (
                <button
                  onClick={() => { setStep((s) => s + 1); setTextInput(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Skip <ChevronRight className="w-3 h-3" />
                </button>
              )}
              {isRatingStep && <div />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
