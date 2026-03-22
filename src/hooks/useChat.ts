import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  reply_to_id: string | null;
  read_at: string | null;
  created_at: string;
  reply_to?: { content: string; sender_id: string } | null;
  reactions?: { reaction_type: string; count: number; user_reacted: boolean }[];
  sender?: { username: string; avatar_url: string | null; aurix_balance: number; college_id: string | null };
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  other_user?: {
    user_id: string;
    username: string;
    avatar_url: string | null;
    aurix_balance: number;
    college_id: string | null;
    streak_count: number;
  };
  last_message?: { content: string; sender_id: string };
  unread_count?: number;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convos) { setLoading(false); return; }

    const enriched = await Promise.all(
      convos.map(async (c) => {
        const otherUserId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;

        const [profileRes, lastMsgRes, unreadRes] = await Promise.all([
          supabase.from("profiles").select("user_id, username, avatar_url, aurix_balance, college_id, streak_count").eq("user_id", otherUserId).single(),
          supabase.from("messages").select("content, sender_id").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).single(),
          supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", c.id).neq("sender_id", user.id).is("read_at", null),
        ]);

        return {
          ...c,
          other_user: profileRes.data || undefined,
          last_message: lastMsgRes.data || undefined,
          unread_count: unreadRes.count || 0,
        } as Conversation;
      })
    );

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime subscription for new messages to update list
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conversations-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useChatMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (!data) { setLoading(false); return; }

    // Enrich with sender profiles and reactions
    const senderIds = [...new Set(data.map((m) => m.sender_id))];
    const replyIds = data.filter((m) => m.reply_to_id).map((m) => m.reply_to_id!);

    const [profilesRes, repliesRes, reactionsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, username, avatar_url, aurix_balance, college_id").in("user_id", senderIds),
      replyIds.length > 0 ? supabase.from("messages").select("id, content, sender_id").in("id", replyIds) : Promise.resolve({ data: [] }),
      supabase.from("message_reactions").select("*").in("message_id", data.map((m) => m.id)),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
    const replyMap = new Map((repliesRes.data || []).map((r) => [r.id, r]));

    const reactionMap = new Map<string, { reaction_type: string; count: number; user_reacted: boolean }[]>();
    for (const r of reactionsRes.data || []) {
      if (!reactionMap.has(r.message_id)) reactionMap.set(r.message_id, []);
      const list = reactionMap.get(r.message_id)!;
      const existing = list.find((x) => x.reaction_type === r.reaction_type);
      if (existing) {
        existing.count++;
        if (r.user_id === user?.id) existing.user_reacted = true;
      } else {
        list.push({ reaction_type: r.reaction_type, count: 1, user_reacted: r.user_id === user?.id });
      }
    }

    const enriched: ChatMessage[] = data.map((m) => ({
      ...m,
      sender: profileMap.get(m.sender_id),
      reply_to: m.reply_to_id ? replyMap.get(m.reply_to_id) : null,
      reactions: reactionMap.get(m.id) || [],
    }));

    setMessages(enriched);
    setLoading(false);

    // Mark unread messages as read
    if (user) {
      const unread = data.filter((m) => m.sender_id !== user.id && !m.read_at);
      if (unread.length > 0) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unread.map((m) => m.id));
      }
    }
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime messages
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        fetchMessages();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "message_reactions",
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchMessages]);

  // Typing broadcast channel
  useEffect(() => {
    if (!conversationId || !user) return;
    const ch = supabase.channel(`typing-${conversationId}`);
    ch.on("broadcast", { event: "typing" }, (payload: any) => {
      if (payload.payload?.user_id !== user.id) {
        setOtherTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
      }
    }).subscribe();
    broadcastChannelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      broadcastChannelRef.current = null;
    };
  }, [conversationId, user]);

  const broadcastTyping = useCallback(() => {
    broadcastChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user?.id },
    });
  }, [user]);

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!conversationId || !user || !content.trim()) return;
    // Profanity check
    const profanityError = validateContent(content);
    if (profanityError) {
      const { toast } = await import("sonner");
      toast.error(profanityError);
      return;
    }
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      reply_to_id: replyToId || null,
    });
  }, [conversationId, user]);

  const toggleReaction = useCallback(async (messageId: string, reactionType: string) => {
    if (!user) return;
    const existing = messages.find((m) => m.id === messageId)?.reactions?.find(
      (r) => r.reaction_type === reactionType && r.user_reacted
    );
    if (existing) {
      await supabase.from("message_reactions").delete().match({ message_id: messageId, user_id: user.id, reaction_type: reactionType });
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, reaction_type: reactionType });
    }
  }, [user, messages]);

  return { messages, loading, sendMessage, toggleReaction, otherTyping, broadcastTyping };
}

export function useStartConversation() {
  const startConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc("get_or_create_conversation", { p_other_user_id: otherUserId });
    if (error) { console.error("Error starting conversation:", error); return null; }
    return data as string;
  }, []);

  return { startConversation };
}
