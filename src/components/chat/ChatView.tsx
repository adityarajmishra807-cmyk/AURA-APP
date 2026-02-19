import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatMessages } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, X, CornerDownLeft } from "lucide-react";
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
        // Get college name
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
    setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const content = input;
    setInput("");
    const reply = replyTo;
    setReplyTo(null);
    await sendMessage(content, reply?.id);
    setIsScrolledUp(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] relative overflow-hidden rounded-2xl">
      <AmbientBackground otherUser={otherUser} energy={energy} />

      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      {/* Header */}
      <ChatHeader
        otherUser={otherUser}
        energy={energy}
        onBack={() => navigate("/chat")}
      />

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto px-4 py-2 space-y-1 relative z-10 transition-opacity duration-500",
          isScrolledUp && "children-focus-mode"
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/50"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground text-sm font-medium">Start the conversation.</p>
            <div className="h-px w-16 mt-2 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date.toISOString()}>
              {/* Date divider */}
              <div className="flex items-center gap-3 py-4">
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                  {getDateLabel(group.date)}
                </span>
                <div className="flex-1 h-px bg-border/30" />
              </div>

              {group.messages.map((msg, i) => {
                const isMine = msg.sender_id === user?.id;
                const prevMsg = group.messages[i - 1];
                const nextMsg = group.messages[i + 1];
                const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
                const isLastMessage = i === group.messages.length - 1 && group === groupedMessages[groupedMessages.length - 1];

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

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="px-4 relative z-10"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl bg-secondary/60 backdrop-blur-sm border-l-2 border-primary/60">
              <CornerDownLeft className="w-3 h-3 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground truncate flex-1">
                {replyTo.content.slice(0, 80)}{replyTo.content.length > 80 ? "…" : ""}
              </p>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className={cn("px-4 pb-4 pt-2 relative z-10 transition-opacity duration-300", isScrolledUp && "opacity-80")}>
        <div className={cn(
          "flex items-end gap-2 p-2 rounded-full bg-secondary/60 backdrop-blur-md border transition-all duration-300",
          input.trim() ? "border-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.15)]" : "border-border/30 shadow-inner"
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 max-h-24 scrollbar-none"
            style={{ fieldSizing: "content" } as any}
          />
          <AnimatePresence>
            {input.trim() && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0 glow-sm"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
