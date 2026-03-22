import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CornerDownLeft, Copy, Reply, Zap, Diamond, Flame, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/hooks/useChat";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { parseVoiceMessageContent } from "@/lib/voiceNotes";
import { VoiceNotePlayer } from "@/components/chat/VoiceNotePlayer";

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
    <div className="mt-1.5 p-3 rounded-xl bg-background/30 border border-border/20 max-w-[240px] backdrop-blur-sm">
      <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">📎 Shared post by @{post.username}</p>
      <p className="text-xs line-clamp-3 leading-relaxed">{post.content}</p>
      {post.image_url && (
        <img src={post.image_url} alt="" className="mt-2 rounded-lg w-full h-24 object-cover" />
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
  const [showReport, setShowReport] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);

  const borderRadius = isMine
    ? `${isFirstInGroup ? "18px" : "6px"} 18px 18px ${isLastInGroup ? "18px" : "6px"}`
    : `18px ${isFirstInGroup ? "18px" : "6px"} ${isLastInGroup ? "18px" : "6px"} 18px`;

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
        if (diff < 10000) return `Seen instantly ⚡`;
        return `Seen ${format(new Date(message.read_at), "h:mm a")}`;
      })()
    : null;

  const isSharedPost = message.content.startsWith("__shared_post:");
  const sharedPostId = isSharedPost ? message.content.replace("__shared_post:", "").trim() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "flex gap-2 group",
        isMine ? "justify-end" : "justify-start",
        !isLastInGroup ? "mb-[3px]" : "mb-2.5"
      )}
    >
      {/* Avatar for first in group (received) */}
      {!isMine && isFirstInGroup ? (
        <div className="w-7 h-7 shrink-0 mt-auto">
          <div className={cn(
            "w-7 h-7 rounded-full overflow-hidden border border-border/20",
            (message.sender?.aurix_balance || 0) >= 2000 && "shadow-[0_0_6px_hsl(var(--primary)/0.2)]"
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
          <div className="flex items-center gap-1.5 mb-1 px-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">
              {message.sender?.username}
            </span>
            {repIcon && <span className="text-[10px]">{repIcon}</span>}
          </div>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-[10px] text-muted-foreground mb-px border-l-2",
            isMine
              ? "bg-primary/15 border-primary-foreground/30"
              : "bg-secondary/50 border-primary/40"
          )}>
            <CornerDownLeft className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{(message.reply_to.content || "").slice(0, 80)}</span>
          </div>
        )}

        {/* Bubble */}
        {(() => {
          const voiceNote = parseVoiceMessageContent(message.content);
          const isVoice = Boolean(voiceNote);
          const audioUrl = voiceNote?.url || null;

          return (
            <motion.div
              onClick={handleTap}
              onContextMenu={(e) => { e.preventDefault(); setShowActions(true); }}
              animate={tapped ? { scale: 1.02 } : { scale: 1 }}
              transition={{ duration: 0.1 }}
              className={cn(
                "px-3.5 py-2.5 text-[14px] leading-[1.55] relative cursor-pointer select-none transition-all duration-200",
                isMine
                  ? "gradient-primary text-primary-foreground shadow-[0_2px_16px_hsl(var(--primary)/0.25)]"
                  : "bg-card/70 backdrop-blur-md text-foreground border border-border/25 shadow-[0_1px_8px_hsl(var(--background)/0.3)]",
                tapped && (isMine ? "shadow-[0_4px_24px_hsl(var(--primary)/0.4)]" : "shadow-[0_4px_16px_hsl(var(--background)/0.5)]")
              )}
              style={{ borderRadius }}
            >
              {isSharedPost && sharedPostId ? (
                <SharedPostEmbed postId={sharedPostId} />
              ) : isVoice && audioUrl ? (
                audioFailed ? (
                  <a
                    href={audioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "flex items-center justify-between gap-3 min-w-[180px] rounded-xl px-3 py-2 text-sm",
                      isMine
                        ? "bg-primary-foreground/10 text-primary-foreground"
                        : "bg-secondary/60 text-foreground"
                    )}
                  >
                    <span className="truncate">🎤 Open voice note</span>
                    <span className="text-xs opacity-70">Tap</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2.5 min-w-[180px]">
                    <span className="text-base">🎤</span>
                    <audio
                      src={audioUrl}
                      controls
                      preload="metadata"
                      className="h-8 flex-1 [&::-webkit-media-controls-panel]:bg-transparent"
                      style={{ maxWidth: 200 }}
                      onError={() => setAudioFailed(true)}
                    >
                      {voiceNote?.mimeType ? <source src={audioUrl} type={voiceNote.mimeType} /> : null}
                    </audio>
                  </div>
                )
              ) : (
                <span className="whitespace-pre-wrap break-words">{message.content}</span>
              )}

              {/* Time */}
              <span className={cn(
                "text-[9px] ml-2.5 inline-block align-bottom leading-none",
                isMine ? "text-primary-foreground/50" : "text-muted-foreground/70"
              )}>
                {format(new Date(message.created_at), "h:mm a")}
              </span>
            </motion.div>
          );
        })()}

        {/* Reactions display */}
        {message.reactions && message.reactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex items-center gap-1 mt-1 px-1", isMine && "justify-end")}
          >
            {message.reactions.map((r) => {
              const rt = reactionTypes.find((t) => t.key === r.reaction_type);
              if (!rt) return null;
              return (
                <motion.button
                  key={r.reaction_type}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onReact(message.id, r.reaction_type)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all duration-200",
                    r.user_reacted
                      ? "bg-primary/20 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.15)]"
                      : "bg-card/60 text-muted-foreground hover:bg-card/80 border border-border/20"
                  )}
                >
                  <rt.icon className="w-3 h-3" />
                  <span>{r.count}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Seen indicator */}
        {seenText && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[9px] text-primary/50 mt-1 px-1 font-medium"
          >
            ✓✓ {seenText}
          </motion.p>
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
                initial={{ opacity: 0, scale: 0.7, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: 6 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className={cn(
                  "absolute z-50 flex items-center gap-0.5 p-1 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/30 shadow-2xl shadow-black/30",
                  isMine ? "right-0 -top-11" : "left-8 -top-11"
                )}
              >
                <button
                  onClick={() => { onReply(); setShowActions(false); }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-all"
                >
                  <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {reactionTypes.map((rt) => (
                  <button
                    key={rt.key}
                    onClick={() => { onReact(message.id, rt.key); setShowActions(false); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-all"
                  >
                    <rt.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                ))}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                    setShowActions(false);
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {!isMine && (
                  <button
                    onClick={() => { setShowReport(true); setShowActions(false); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-destructive/10 transition-all"
                  >
                    <Flag className="w-3.5 h-3.5 text-destructive/70" />
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Report dialog */}
        {!isMine && (
          <ReportDialog
            open={showReport}
            onOpenChange={setShowReport}
            contentType="message"
            contentId={message.id}
            reportedUserId={message.sender_id}
          />
        )}
      </div>
    </motion.div>
  );
}
