import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CornerDownLeft, Copy, Reply, Zap, Diamond, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/hooks/useChat";

const reactionTypes = [
  { key: "impact", label: "Impact", icon: Zap },
  { key: "value", label: "Value", icon: Diamond },
  { key: "sharp", label: "Sharp", icon: Flame },
];

function getRepIcon(balance: number) {
  if (balance >= 5000) return "💎";
  if (balance >= 2000) return "🔥";
  if (balance >= 500) return "⚡";
  return null;
}

interface SharedPostData {
  id: string;
  content: string;
  image_url: string | null;
  username: string;
}

function SharedPostEmbed({ postId }: { postId: string }) {
  const [post, setPost] = useState<SharedPostData | null>(null);

  useEffect(() => {
    supabase
      .from("posts")
      .select("id, content, image_url, profiles!posts_user_id_fkey(username)")
      .eq("id", postId)
      .single()
      .then(({ data }) => {
        if (data) {
          const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
          setPost({
            id: data.id,
            content: data.content,
            image_url: data.image_url,
            username: profile?.username || "unknown",
          });
        }
      });
  }, [postId]);

  if (!post) return <span className="text-xs text-muted-foreground italic">Loading shared post...</span>;

  return (
    <div className="mt-1 p-2.5 rounded-lg bg-secondary/40 border border-border/30 max-w-[240px]">
      <p className="text-[10px] text-muted-foreground mb-1">📎 Shared post by @{post.username}</p>
      <p className="text-xs line-clamp-3">{post.content}</p>
      {post.image_url && (
        <img src={post.image_url} alt="" className="mt-1.5 rounded-md w-full h-20 object-cover" />
      )}
    </div>
  );
}

interface Props {
  message: ChatMessage;
  isMine: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isLastMessage: boolean;
  currentUserId: string;
  onReply: () => void;
  onReact: (messageId: string, reactionType: string) => void;
}

export function ChatBubble({
  message,
  isMine,
  isFirstInGroup,
  isLastInGroup,
  isLastMessage,
  currentUserId,
  onReply,
  onReact,
}: Props) {
  const [showActions, setShowActions] = useState(false);
  const [tapped, setTapped] = useState(false);

  const borderRadius = isMine
    ? `${isFirstInGroup ? "16px" : "6px"} 16px 16px ${isLastInGroup ? "16px" : "6px"}`
    : `16px ${isFirstInGroup ? "16px" : "6px"} ${isLastInGroup ? "16px" : "6px"} 16px`;

  const repIcon = !isMine ? getRepIcon(message.sender?.aurix_balance || 0) : null;

  const handleTap = () => {
    setTapped(true);
    setTimeout(() => setTapped(false), 200);
  };

  const seenText = isLastMessage && isMine && message.read_at
    ? (() => {
        const readTime = new Date(message.read_at).getTime();
        const sentTime = new Date(message.created_at).getTime();
        const diff = readTime - sentTime;
        if (diff < 10000) return `✔ Seen instantly ⚡`;
        return `✔ Seen ${format(new Date(message.read_at), "h:mm a")}`;
      })()
    : null;

  // Check if this is a shared post message
  const isSharedPost = message.content.startsWith("__shared_post:");
  const sharedPostId = isSharedPost ? message.content.replace("__shared_post:", "").trim() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "flex gap-2 group",
        isMine ? "justify-end" : "justify-start",
        !isLastInGroup ? "mb-0.5" : "mb-2"
      )}
    >
      {/* Avatar for first in group (received) */}
      {!isMine && isFirstInGroup ? (
        <div className="w-7 h-7 shrink-0 mt-auto">
          <div className={cn(
            "w-7 h-7 rounded-full overflow-hidden border border-border/30",
            (message.sender?.aurix_balance || 0) >= 2000 && "shadow-[0_0_4px_hsl(var(--primary)/0.3)]"
          )}>
            {message.sender?.avatar_url ? (
              <img src={message.sender.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] font-bold font-display">
                {message.sender?.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      ) : !isMine ? (
        <div className="w-7 shrink-0" />
      ) : null}

      <div className={cn("max-w-[75%] relative", isMine && "flex flex-col items-end")}>
        {/* Sender name + rep */}
        {!isMine && isFirstInGroup && (
          <div className="flex items-center gap-1 mb-0.5 px-1">
            <span className="text-[10px] font-medium text-muted-foreground">
              {message.sender?.username}
            </span>
            {repIcon && <span className="text-[10px]">{repIcon}</span>}
          </div>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-t-lg text-[10px] text-muted-foreground mb-px border-l-2 border-primary/40",
            isMine ? "bg-primary/10" : "bg-secondary/40"
          )}>
            <CornerDownLeft className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{(message.reply_to.content || "").slice(0, 80)}</span>
          </div>
        )}

        {/* Bubble */}
        {(() => {
          const isVoice = message.content.startsWith("🎤 Voice message\n");
          const audioUrl = isVoice ? message.content.split("\n")[1] : null;

          return (
            <motion.div
              onClick={handleTap}
              onContextMenu={(e) => { e.preventDefault(); setShowActions(true); }}
              animate={tapped ? { scale: 1.01 } : { scale: 1 }}
              transition={{ duration: 0.1 }}
              className={cn(
                "px-3.5 py-2 text-sm leading-relaxed relative cursor-pointer select-none transition-shadow duration-200",
                isMine
                  ? "gradient-primary text-primary-foreground shadow-[0_2px_12px_hsl(var(--primary)/0.2)]"
                  : "bg-card/60 backdrop-blur-sm text-foreground border border-border/30",
                tapped && (isMine ? "shadow-[0_4px_20px_hsl(var(--primary)/0.35)]" : "shadow-md")
              )}
              style={{ borderRadius }}
            >
              {isSharedPost && sharedPostId ? (
                <SharedPostEmbed postId={sharedPostId} />
              ) : isVoice && audioUrl ? (
                <div className="flex items-center gap-2 min-w-[180px]">
                  <span className="text-base">🎤</span>
                  <audio
                    src={audioUrl}
                    controls
                    className="h-8 flex-1 [&::-webkit-media-controls-panel]:bg-transparent"
                    style={{ maxWidth: 200 }}
                  />
                </div>
              ) : (
                message.content
              )}

              {/* Time */}
              <span className={cn(
                "text-[9px] ml-2 inline-block align-bottom",
                isMine ? "text-primary-foreground/60" : "text-muted-foreground"
              )}>
                {format(new Date(message.created_at), "h:mm a")}
              </span>
            </motion.div>
          );
        })()}

        {/* Reactions display */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn("flex items-center gap-1.5 mt-0.5 px-1", isMine && "justify-end")}>
            {message.reactions.map((r) => {
              const rt = reactionTypes.find((t) => t.key === r.reaction_type);
              if (!rt) return null;
              return (
                <button
                  key={r.reaction_type}
                  onClick={() => onReact(message.id, r.reaction_type)}
                  className={cn(
                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                    r.user_reacted
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                  )}
                >
                  <span>{rt.label}</span>
                  <span>•</span>
                  <span>{r.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Seen indicator */}
        {seenText && (
          <p className="text-[9px] text-muted-foreground/60 mt-0.5 px-1">
            {seenText}
          </p>
        )}

        {/* Action menu (long press) */}
        <AnimatePresence>
          {showActions && (
            <>
              <motion.div
                className="fixed inset-0 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowActions(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn(
                  "absolute z-50 flex items-center gap-1 p-1.5 rounded-full bg-card/90 backdrop-blur-lg border border-border/50 shadow-xl",
                  isMine ? "right-0 -top-10" : "left-8 -top-10"
                )}
              >
                <button
                  onClick={() => { onReply(); setShowActions(false); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors"
                >
                  <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {reactionTypes.map((rt) => (
                  <button
                    key={rt.key}
                    onClick={() => { onReact(message.id, rt.key); setShowActions(false); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors"
                  >
                    <rt.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                ))}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                    setShowActions(false);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
