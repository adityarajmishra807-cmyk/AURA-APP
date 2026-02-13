import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Send, Coins, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Transfer() {
  const { profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const fee = Math.ceil(amount * 0.05);
  const netAmount = amount - fee;

  const handleTransfer = async () => {
    if (!username.trim()) {
      toast.error("Enter a username");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("transfer_aurix", {
      p_receiver_username: username.trim(),
      p_amount: amount,
    });

    const result = data as any;
    if (error || !result?.success) {
      toast.error(result?.error || "Transfer failed");
      setSubmitting(false);
      return;
    }

    toast.success(`Sent ${result.received} AURIX to @${username} (fee: ${result.fee})`);
    await refreshProfile();
    setUsername("");
    setAmount(5);
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <Send className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            Transfer AURIX
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Send AURIX to another user</p>
        </motion.div>

        <motion.div
          className="glass-card rounded-2xl p-5 md:p-8 glow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Balance display */}
          <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-muted/30">
            <Coins className="w-5 h-5 text-aura-gold" />
            <span className="text-sm text-muted-foreground">Your balance:</span>
            <span className="font-display font-bold text-foreground">
              {(profile?.aurix_balance || 0).toLocaleString()} AURIX
            </span>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Username</Label>
              <Input
                id="recipient"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace("@", ""))}
                className="bg-muted/50 border-border/50 focus:border-primary"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Amount</Label>
                <span className="font-display text-xl font-bold text-foreground">{amount} AURIX</span>
              </div>
              <Slider
                value={[amount]}
                onValueChange={([v]) => setAmount(v)}
                min={1}
                max={50}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>50 max/day</span>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-muted/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground font-medium">{amount} AURIX</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee (5%)</span>
                <span className="text-destructive font-medium">-{fee} AURIX</span>
              </div>
              <div className="border-t border-border/30 pt-2 flex justify-between">
                <span className="text-muted-foreground font-medium">Recipient gets</span>
                <span className="text-aura-mint font-bold">{netAmount} AURIX</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Max 50 AURIX/day, 500/month. Account must be 3+ days old.</span>
            </div>

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                onClick={handleTransfer}
                disabled={submitting || !username.trim() || amount <= 0}
                className="w-full gradient-primary text-primary-foreground font-semibold h-11 glow-sm"
              >
                {submitting ? "Sending..." : (
                  <>
                    Send {amount} AURIX
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
