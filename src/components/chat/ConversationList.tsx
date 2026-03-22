import { useState } from "react";
import { ConversationListSkeleton } from "@/components/skeletons/Skeletons";
import { motion, AnimatePresence } from "framer-motion";
import { useConversations, useStartConversation } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, MessageCircle, Plus, ArrowLeft, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { isVoiceMessageLike, parseVoiceMessageContent } from "@/lib/voiceNotes";

function getAuraTier(balance: number) {
  if (balance >= 5000) return { label: "💎", ring: "ring-2 ring-aura-gold/40 shadow-[0_0_12px_hsl(var(--aura-gold)/0.25)]" };
  if (balance >= 2000) return { label: "🔥", ring: "ring-2 ring-accent/30 shadow-[0_0_10px_hsl(var(--accent)/0.2)]" };
  if (balance >= 500) return { label: "⚡", ring: "ring-1 ring-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.15)]" };
  return { label: "", ring: "" };
}

function formatPreview(content: string): string {
  if (content.startsWith("__shared_post:")) return "📎 Shared a post";
  if (content.startsWith("__call:ended:video:")) return `📹 Video call · ${content.split(":")[3]}`;
  if (content.startsWith("__call:ended:audio:")) return `📞 Voice call · ${content.split(":")[3]}`;
  if (content.startsWith("__call:missed:video:")) return "📹 Missed video call";
  if (content.startsWith("__call:missed:audio:")) return "📞 Missed voice call";
  if (content.startsWith("__call:rejected:video:")) return "📹 Declined video call";
  if (content.startsWith("__call:rejected:audio:")) return "📞 Declined voice call";
  if (content.startsWith("__call:")) return "📞 Call";
  if (parseVoiceMessageContent(content) || isVoiceMessageLike(content)) return "🎙️ Voice note";
  return content;
}

export function ConversationList() {
  const { conversations, loading } = useConversations();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startConversation } = useStartConversation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const filtered = conversations.filter((c) =>
    c.other_user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserSearch = async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url, aurix_balance, college_id")
      .ilike("username", `%${query}%`)
      .neq("user_id", user?.id || "")
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleStartChat = async (otherUserId: string) => {
    const convoId = await startConversation(otherUserId);
    if (convoId) {
      setShowNewChat(false);
      navigate(`/chat/${convoId}`);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header with ambient glow */}
      <div className="relative p-4 pb-3">
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />
        
        <div className="relative flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
            {totalUnread > 0 && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-primary mt-0.5 font-medium"
              >
                {totalUnread} unread conversation{totalUnread > 1 ? "s" : ""}
              </motion.p>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.08, rotate: showNewChat ? -90 : 0 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowNewChat(!showNewChat)}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center tap-target transition-all duration-300",
              showNewChat
                ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {showNewChat ? <ArrowLeft className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Search with glow on focus */}
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder={showNewChat ? "Search users…" : "Search conversations…"}
            value={showNewChat ? userSearch : searchQuery}
            onChange={(e) => showNewChat ? handleUserSearch(e.target.value) : setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/40 border-border/30 rounded-xl h-11 transition-all duration-300 focus:bg-secondary/60 focus:border-primary/30 focus:shadow-[0_0_16px_hsl(var(--primary)/0.08)]"
          />
        </div>
      </div>

      {/* Gradient divider */}
      <div className="h-px mx-4 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        <AnimatePresence mode="wait">
          {showNewChat ? (
            <motion.div
              key="new-chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-0.5 p-1"
            >
              {searchResults.map((u, i) => {
                const tier = getAuraTier(u.aurix_balance);
                return (
                  <motion.button
                    key={u.user_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStartChat(u.user_id)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary/50 transition-all tap-target"
                  >
                    <div className={cn("relative rounded-full", tier.ring)}>
                      <Avatar className="w-11 h-11 border border-border/50">
                        <AvatarImage src={u.avatar_url || ""} />
                        <AvatarFallback className="bg-muted font-display font-bold text-sm">
                          {u.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.username} {tier.label}
                      </p>
                    </div>
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                );
              })}
              {userSearch.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
              )}
              {userSearch.length < 2 && (
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="w-6 h-6 text-primary/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">Search for people to chat with</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="conversations"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-0.5 p-1"
            >
              {loading ? (
                <ConversationListSkeleton />
              ) : filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 px-4"
                >
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-primary/[0.06] flex items-center justify-center">
                      <MessageCircle className="w-9 h-9 text-primary/30" />
                    </div>
                    <motion.div
                      className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"
                      animate={{ y: [0, -4, 0], rotate: [0, 10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary/50" />
                    </motion.div>
                  </div>
                  <p className="text-foreground font-medium text-sm">
                    {searchQuery ? "No conversations found" : "No messages yet"}
                  </p>
                  <p className="text-muted-foreground/60 text-xs mt-1.5 text-center max-w-[200px]">
                    {searchQuery ? "Try a different search" : "Tap + to start a conversation with someone"}
                  </p>
                </motion.div>
              ) : (
                filtered.map((c, i) => {
                  const tier = getAuraTier(c.other_user?.aurix_balance || 0);
                  const isOnline = (c.other_user?.streak_count || 0) > 0;
                  const hasUnread = (c.unread_count || 0) > 0;
                  return (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.035, type: "spring", stiffness: 300, damping: 25 }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/chat/${c.id}`)}
                      className={cn(
                        "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 tap-target group relative",
                        hasUnread
                          ? "bg-primary/[0.04] hover:bg-primary/[0.08]"
                          : "hover:bg-secondary/40"
                      )}
                    >
                      {/* Unread indicator line */}
                      {hasUnread && (
                        <motion.div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-primary"
                          layoutId={`unread-${c.id}`}
                          initial={{ opacity: 0, scaleY: 0 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                        />
                      )}

                      <div className="relative shrink-0">
                        <div className={cn("rounded-full transition-shadow duration-300", tier.ring)}>
                          <Avatar className="w-12 h-12 border border-border/40">
                            <AvatarImage src={c.other_user?.avatar_url || ""} />
                            <AvatarFallback className="bg-muted font-display font-bold">
                              {c.other_user?.username?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        {/* Presence dot */}
                        <div className={cn(
                          "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[2.5px] border-background transition-all",
                          isOnline
                            ? "bg-aura-mint shadow-[0_0_8px_hsl(var(--aura-mint)/0.6)]"
                            : "bg-muted-foreground/25"
                        )} />
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-sm truncate transition-colors",
                            hasUnread ? "font-bold text-foreground" : "font-medium text-foreground"
                          )}>
                            {c.other_user?.username || "Unknown"} {tier.label}
                          </p>
                          <span className={cn(
                            "text-[10px] shrink-0",
                            hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
                          )}>
                            {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5 gap-2">
                          <p className={cn(
                            "text-xs truncate",
                            hasUnread ? "text-foreground/70" : "text-muted-foreground"
                          )}>
                            {c.last_message
                              ? (c.last_message.sender_id === user?.id ? "You: " : "") + formatPreview(c.last_message.content)
                              : "Start the conversation"}
                          </p>
                          {hasUnread && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 20 }}
                              className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                            >
                              {c.unread_count}
                            </motion.span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
