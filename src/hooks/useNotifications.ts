import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export function useNotifications() { // force rebuild
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
        setNotifications(data as AppNotification[]);
        setUnreadCount(data.filter((n: any) => !n.read).length);
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

  // Realtime subscription with reconnection
  useEffect(() => {
    fetchNotifications();

    if (!user) return;

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
              // Deduplicate
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });
            setUnreadCount((c) => c + 1);

            // Browser notification
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new window.Notification(newNotif.title, {
                  body: newNotif.body,
                  icon: "/favicon.ico",
                  tag: newNotif.id, // prevents duplicate OS notifications
                });
              } catch {
                // Notification API not available in this context
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            // Retry with backoff
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
            retryCountRef.current++;
            setTimeout(() => {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
              }
              subscribe();
            }, delay);
          } else if (status === "SUBSCRIBED") {
            retryCountRef.current = 0;
          }
        });
    };

    subscribe();

    return () => {
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
