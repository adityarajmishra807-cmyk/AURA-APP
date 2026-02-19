import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConversations, useStartConversation } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, MessageCircle, Plus, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

function getAuraTier(balance: number) {
  if (balance >= 5000) return { label: "💎", glow: "shadow-[0_0_8px_hsl(var(--aura-gold)/0.5)]" };
  if (balance >= 2000) return { label: "🔥", glow: "shadow-[0_0_6px_hsl(var(--accent)/0.4)]" };
  if (balance >= 500) return { label: "⚡", glow: "shadow-[0_0_4px_hsl(var(--primary)/0.3)]" };
  return { label: "", glow: "" };
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewChat(!showNewChat)}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary tap-target"
          >
            {showNewChat ? <ArrowLeft className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={showNewChat ? "Search users…" : "Search conversations…"}
            value={showNewChat ? userSearch : searchQuery}
            onChange={(e) => showNewChat ? handleUserSearch(e.target.value) : setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 rounded-full h-10"
          />
        </div>
      </div>

      {/* Gradient divider */}
      <div className="h-px mx-4 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="wait">
          {showNewChat ? (
            <motion.div
              key="new-chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-1"
            >
              {searchResults.map((u) => {
                const tier = getAuraTier(u.aurix_balance);
                return (
                  <motion.button
                    key={u.user_id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStartChat(u.user_id)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary/50 transition-colors tap-target"
                  >
                    <div className={cn("relative rounded-full", tier.glow)}>
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
                <p className="text-center text-sm text-muted-foreground py-8">Type to search users</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="conversations"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-1"
            >
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="w-11 h-11 rounded-full shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 rounded shimmer" />
                      <div className="h-3 w-40 rounded shimmer" />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-sm text-center">
                    {searchQuery ? "No conversations found" : "No messages yet"}
                  </p>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    Start a conversation with someone
                  </p>
                </div>
              ) : (
                filtered.map((c, i) => {
                  const tier = getAuraTier(c.other_user?.aurix_balance || 0);
                  const isOnline = (c.other_user?.streak_count || 0) > 0;
                  return (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/chat/${c.id}`)}
                      className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary/50 transition-all tap-target group"
                    >
                      <div className="relative">
                        <div className={cn("rounded-full", tier.glow)}>
                          <Avatar className="w-12 h-12 border border-border/50">
                            <AvatarImage src={c.other_user?.avatar_url || ""} />
                            <AvatarFallback className="bg-muted font-display font-bold">
                              {c.other_user?.username?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        {/* Presence indicator */}
                        <div className={cn(
                          "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background transition-all",
                          isOnline ? "bg-aura-mint shadow-[0_0_6px_hsl(var(--aura-mint)/0.6)]" : "bg-muted-foreground/30"
                        )} />
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.other_user?.username || "Unknown"} {tier.label}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground truncate pr-2">
                            {c.last_message
                              ? (c.last_message.sender_id === user?.id ? "You: " : "") + c.last_message.content
                              : "Start the conversation."}
                          </p>
                          {(c.unread_count || 0) > 0 && (
                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center glow-sm">
                              {c.unread_count}
                            </span>
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
