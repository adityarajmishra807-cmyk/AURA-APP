import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface SharePostDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Friend {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export function SharePostDialog({ postId, open, onOpenChange }: SharePostDialogProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from("friends")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!data) { setLoading(false); return; }

      const ids = data.map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      if (ids.length === 0) { setFriends([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", ids);

      setFriends((profiles as Friend[]) || []);
      setLoading(false);
    })();
  }, [open, user]);

  const handleShare = async (friendId: string) => {
    if (!user) return;
    setSending(friendId);
    try {
      const { data: convId } = await supabase.rpc("get_or_create_conversation", {
        p_other_user_id: friendId,
      });

      if (!convId) throw new Error("Failed to create conversation");

      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        content: `__shared_post:${postId}`,
      });

      if (error) throw error;
      toast.success("Post shared!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to share post");
    }
    setSending(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share post</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No friends yet</p>
          ) : (
            friends.map((f) => (
              <button
                key={f.user_id}
                onClick={() => handleShare(f.user_id)}
                disabled={sending !== null}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors tap-scale"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={f.avatar_url || ""} />
                  <AvatarFallback className="text-xs font-bold">{f.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium flex-1 text-left">@{f.username}</span>
                {sending === f.user_id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Send className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
