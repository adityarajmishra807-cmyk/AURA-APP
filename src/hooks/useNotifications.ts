import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseVoiceMessageContent } from "@/lib/voiceNotes";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}


function formatNotificationBody(type: string, body: string) {
  if (type !== "new_message") return body;

  if (body.startsWith("__call:ended:video:")) return `📹 Video call · ${body.split(":")[3]}`;
  if (body.startsWith("__call:ended:audio:")) return `📞 Voice call · ${body.split(":")[3]}`;
  if (body.startsWith("__call:missed:video:")) return "📹 Missed video call";
  if (body.startsWith("__call:missed:audio:")) return "📞 Missed voice call";
  if (body.startsWith("__call:rejected:video:")) return "📹 Declined video call";
  if (body.startsWith("__call:rejected:audio:")) return "📞 Declined voice call";
  if (body.startsWith("__call:")) return "📞 Call";
  if (parseVoiceMessageContent(body)) return "🎙️ Voice message";

  return body;
}

  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const retryCountRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to fetch notifications:", error.message);
        return;
      }

      if (data) {
        const formatted = (data as AppNotification[]).map((notification) => ({
          ...notification,
          body: formatNotificationBody(notification.type, notification.body),
        }));
        setNotifications(formatted);
        setUnreadCount(formatted.filter((n) => !n.read).length);
      }
    } catch (err) {
      console.error("Notification fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id);
    
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    
    if (!error) {
      setNotifications((prev) => {
        const n = prev.find((x) => x.id === id);
        if (n && !n.read) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((x) => x.id !== id);
      });
    }
  }, [user]);

  // Realtime subscription with polling fallback
  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    let pollingInterval: ReturnType<typeof setInterval> | null = null;
    let realtimeActive = false;

    const startPolling = () => {
      if (pollingInterval) return;
      pollingInterval = setInterval(fetchNotifications, 30000); // 30s fallback
    };

    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    const subscribe = () => {
      channelRef.current = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as AppNotification;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });
            setUnreadCount((c) => c + 1);

            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new window.Notification(newNotif.title, {
                  body: newNotif.body,
                  icon: "/favicon.ico",
                  tag: newNotif.id,
                });
              } catch {}
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            realtimeActive = true;
            retryCountRef.current = 0;
            stopPolling(); // realtime works, no need to poll
          } else if (status === "CHANNEL_ERROR") {
            realtimeActive = false;
            startPolling(); // fall back to polling
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 60000);
            retryCountRef.current++;
            setTimeout(() => {
              if (channelRef.current) supabase.removeChannel(channelRef.current);
              subscribe();
            }, delay);
          }
        });
    };

    subscribe();
    // Start polling initially until realtime confirms
    startPolling();

    return () => {
      stopPolling();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchNotifications, user]);

  const requestPushPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    try {
      const result = await window.Notification.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPushPermission,
    refresh: fetchNotifications,
  };
}
