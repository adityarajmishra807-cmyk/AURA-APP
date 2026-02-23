import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatMessages } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, X, CornerDownLeft, ChevronDown, Smile, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ChatBubble } from "./ChatBubble";
import { ChatHeader } from "./ChatHeader";
import { AmbientBackground } from "./AmbientBackground";

export function ChatView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { messages, loading, sendMessage, toggleReaction } = useChatMessages(conversationId || null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; sender_id: string } | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout>();

  // Fetch other user profile
  useEffect(() => {
    if (!conversationId || !user) return;
    (async () => {
      const { data: convo } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      if (!convo) return;
      const otherUserId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, aurix_balance, college_id, streak_count")
        .eq("user_id", otherUserId)
        .single();
      if (profile) {
        if (profile.college_id) {
          const { data: college } = await supabase.from("colleges").select("name").eq("id", profile.college_id).single();
          setOtherUser({ ...profile, college_name: college?.name });
        } else {
          setOtherUser(profile);
        }
      }
    })();
  }, [conversationId, user]);

  // Auto scroll
  useEffect(() => {
    if (!isScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isScrolledUp]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 120);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsScrolledUp(false);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input;
    const reply = replyTo;
    setInput("");
    setReplyTo(null);
    setSending(true);
    await sendMessage(content, reply?.id);
    setSending(false);
    setIsScrolledUp(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recordingTimerRef.current);
        setRecordingDuration(0);

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) { toast.error("Recording too short"); return; }

        setSending(true);
        const fileName = `${user!.id}/${Date.now()}.webm`;
        const { error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(fileName, blob, { contentType: "audio/webm" });

        if (uploadErr) { toast.error("Failed to upload voice"); setSending(false); return; }

        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
        await sendMessage(`🎤 Voice message\n${urlData.publicUrl}`);
        setSending(false);
        setIsScrolledUp(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Group messages by date
  const groupedMessages: { date: Date; messages: typeof messages }[] = [];
  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (!lastGroup || !isSameDay(lastGroup.date, msgDate)) {
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      lastGroup.messages.push(msg);
    }
  });

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  // Calculate conversation energy
  const recentMessages = messages.filter(
    (m) => Date.now() - new Date(m.created_at).getTime() < 3600000
  );
  const energy = recentMessages.length > 10 ? "intense" : recentMessages.length > 4 ? "active" : "calm";

  const hasText = input.trim().length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-4rem)] relative overflow-hidden rounded-2xl">
      <AmbientBackground otherUser={otherUser} energy={energy} />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none z-0"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      {/* Header */}
      <ChatHeader
        otherUser={otherUser}
        energy={energy}
        onBack={() => navigate("/chat")}
      />

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto px-3 py-3 space-y-0.5 relative z-10 transition-opacity duration-500",
          isScrolledUp && "opacity-95"
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/50"
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 0.65, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-muted-foreground text-sm font-medium">Start the conversation.</p>
              <div className="h-px w-20 mx-auto mt-2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </motion.div>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date.toISOString()}>
              {/* Date divider */}
              <div className="flex items-center gap-3 py-4">
                <div className="flex-1 h-px bg-border/20" />
                <span className="text-[9px] text-muted-foreground/70 font-medium uppercase tracking-[0.12em]">
                  {getDateLabel(group.date)}
                </span>
                <div className="flex-1 h-px bg-border/20" />
              </div>

              {group.messages.map((msg, i) => {
                // Check for call system messages
                if (msg.content.startsWith("__call:")) {
                  const parts = msg.content.split(":");
                  const status = parts[1]; // ended, missed, rejected
                  const callType = parts[2]; // audio, video
                  const duration = parts[3] || "";
                  const isMine = msg.sender_id === user?.id;

                  const icon = callType === "video" ? "📹" : "📞";
                  let label = "";
                  let color = "text-muted-foreground";
                  if (status === "ended") {
                    label = `${icon} ${callType === "video" ? "Video" : "Voice"} call · ${duration}`;
                    color = "text-muted-foreground";
                  } else if (status === "missed") {
                    label = `${icon} Missed ${callType === "video" ? "video" : "voice"} call`;
                    color = "text-destructive";
                  } else if (status === "rejected") {
                    label = `${icon} ${isMine ? "Call declined" : "Declined call"}`;
                    color = "text-destructive/70";
                  }

                  return (
                    <div key={msg.id} className="flex justify-center my-3">
                      <span className={cn(
                        "text-[11px] font-medium px-3 py-1 rounded-full bg-secondary/40 backdrop-blur-sm border border-border/20",
                        color
                      )}>
                        {label}
                      </span>
                    </div>
                  );
                }

                const isMine = msg.sender_id === user?.id;
                const prevMsg = group.messages[i - 1];
                const nextMsg = group.messages[i + 1];
                const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || prevMsg.content.startsWith("__call:");
                const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || nextMsg.content.startsWith("__call:");
                const isLastMessage =
                  i === group.messages.length - 1 &&
                  group === groupedMessages[groupedMessages.length - 1];

                return (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isMine={isMine}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    isLastMessage={isLastMessage}
                    currentUserId={user?.id || ""}
                    onReply={() => {
                      setReplyTo({ id: msg.id, content: msg.content, sender_id: msg.sender_id });
                      inputRef.current?.focus();
                    }}
                    onReact={toggleReaction}
                  />
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom FAB */}
      <AnimatePresence>
        {isScrolledUp && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 right-4 z-20 w-9 h-9 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <ChevronDown className="w-4 h-4 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            className="px-4 relative z-10"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl bg-secondary/50 backdrop-blur-sm border-l-2 border-primary/50">
              <CornerDownLeft className="w-3 h-3 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground truncate flex-1">
                {replyTo.content.slice(0, 80)}{replyTo.content.length > 80 ? "…" : ""}
              </p>
              <button
                onClick={() => setReplyTo(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className={cn(
        "px-3 pb-4 pt-2 relative z-10 transition-opacity duration-300",
        isScrolledUp && "opacity-80"
      )}>
        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-4 py-2 mb-2 rounded-xl bg-destructive/10 border border-destructive/20"
            >
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-destructive"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-xs text-destructive font-medium">
                Recording… {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn(
          "flex items-end gap-2 px-2 py-1.5 rounded-2xl backdrop-blur-md border transition-all duration-300",
          isRecording
            ? "bg-destructive/5 border-destructive/30"
            : hasText
              ? "bg-card/70 border-primary/30 shadow-[0_0_16px_hsl(var(--primary)/0.12)]"
              : "bg-card/50 border-border/20"
        )}>
          {/* Emoji placeholder */}
          <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 mb-0.5">
            <Smile className="w-4.5 h-4.5" />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Recording voice…" : "Message…"}
            rows={1}
            disabled={isRecording}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/60 py-2 max-h-28 scrollbar-none leading-relaxed disabled:opacity-50"
            style={{ fieldSizing: "content" } as any}
          />

          <AnimatePresence mode="wait">
            {isRecording ? (
              <motion.button
                key="stop"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 22 }}
                whileTap={{ scale: 0.88 }}
                onClick={stopRecording}
                className="w-9 h-9 rounded-xl bg-destructive flex items-center justify-center shrink-0 shadow-[0_2px_12px_hsl(var(--destructive)/0.35)] mb-0.5"
              >
                <Square className="w-3.5 h-3.5 text-white fill-white" />
              </motion.button>
            ) : hasText ? (
              <motion.button
                key="send"
                initial={{ scale: 0, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, rotate: 20 }}
                transition={{ type: "spring", stiffness: 450, damping: 22 }}
                whileTap={{ scale: 0.88 }}
                onClick={handleSend}
                disabled={sending}
                className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-[0_2px_12px_hsl(var(--primary)/0.35)] mb-0.5 disabled:opacity-60"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </motion.button>
            ) : (
              <motion.button
                key="mic"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileTap={{ scale: 0.88 }}
                onClick={startRecording}
                disabled={sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-0.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
              >
                <Mic className="w-4.5 h-4.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
