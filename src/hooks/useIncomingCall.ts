import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface IncomingCall {
  id: string;
  caller_id: string;
  type: "audio" | "video";
  caller_username?: string;
  caller_avatar?: string;
}

export function useIncomingCall() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user) return;

    // Subscribe to new calls where this user is the receiver
    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const call = payload.new as any;
          if (call.status !== "ringing") return;

          // Fetch caller profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", call.caller_id)
            .single();

          setIncomingCall({
            id: call.id,
            caller_id: call.caller_id,
            type: call.type,
            caller_username: profile?.username,
            caller_avatar: profile?.avatar_url || undefined,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const call = payload.new as any;
          // Dismiss if call was ended/rejected/missed by caller
          if (["ended", "rejected", "missed"].includes(call.status)) {
            setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismiss = useCallback(() => setIncomingCall(null), []);

  return { incomingCall, dismiss };
}
