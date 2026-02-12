import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface FriendButtonProps {
  targetUserId: string;
  friendStatus: "none" | "pending_sent" | "pending_received" | "accepted";
  friendshipId?: string;
  onStatusChange: () => void;
  size?: "sm" | "icon";
}

export function FriendButton({ targetUserId, friendStatus, friendshipId, onStatusChange, size = "icon" }: FriendButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user || user.id === targetUserId) return null;

  const handleAction = async () => {
    setLoading(true);
    try {
      if (friendStatus === "none") {
        const { error } = await supabase.from("friends").insert({
          requester_id: user.id,
          addressee_id: targetUserId,
        });
        if (error) throw error;
        toast.success("Friend request sent!");
      } else if (friendStatus === "pending_received" && friendshipId) {
        const { error } = await supabase.from("friends").update({ status: "accepted" }).eq("id", friendshipId);
        if (error) throw error;
        toast.success("Friend request accepted!");
      } else if (friendshipId) {
        const { error } = await supabase.from("friends").delete().eq("id", friendshipId);
        if (error) throw error;
        toast.success("Removed");
      }
      onStatusChange();
    } catch {
      toast.error("Action failed");
    }
    setLoading(false);
  };

  const config = {
    none: { icon: UserPlus, label: "Add", className: "text-primary hover:bg-primary/10" },
    pending_sent: { icon: Clock, label: "Pending", className: "text-aura-gold hover:bg-aura-gold/10" },
    pending_received: { icon: UserCheck, label: "Accept", className: "text-aura-mint hover:bg-aura-mint/10" },
    accepted: { icon: UserMinus, label: "Remove", className: "text-muted-foreground hover:bg-destructive/10 hover:text-destructive" },
  };

  const { icon: Icon, label, className } = config[friendStatus];

  return (
    <motion.div whileTap={{ scale: 0.9 }}>
      <Button
        variant="ghost"
        size={size}
        onClick={handleAction}
        disabled={loading || friendStatus === "pending_sent"}
        className={className}
        title={label}
      >
        <Icon className="w-4 h-4" />
        {size === "sm" && <span className="ml-1 text-xs">{label}</span>}
      </Button>
    </motion.div>
  );
}
