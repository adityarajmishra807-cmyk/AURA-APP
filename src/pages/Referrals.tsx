import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift, Copy, Check, Coins, UserPlus, Target, Flame, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Referral {
  id: string;
  referred_id: string;
  stage_1_completed: boolean;
  stage_1_rewarded: boolean;
  stage_2_completed: boolean;
  stage_2_rewarded: boolean;
  stage_3_completed: boolean;
  stage_3_rewarded: boolean;
  revoked: boolean;
  created_at: string;
  referred_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export default function Referrals() {
  const { profile, refreshProfile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}/auth?ref=${profile?.referral_code || ""}`;

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    const { data } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", profile?.user_id || "")
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch referred user profiles
      const withProfiles = await Promise.all(
        data.map(async (ref: any) => {
          const { data: prof } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", ref.referred_id)
            .single();
          return { ...ref, referred_profile: prof };
        })
      );
      setReferrals(withProfiles);
    }
    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const claimReward = async (referralId: string, stage: number) => {
    const { data } = await supabase.rpc("claim_referral_reward", {
      p_referral_id: referralId,
      p_stage: stage,
    });
    const result = data as any;
    if (result?.success) {
      toast.success(`+${result.reward} AURIX from referral stage ${stage}!`);
      await refreshProfile();
      fetchReferrals();
    } else {
      toast.error(result?.error || "Failed to claim reward");
    }
  };

  const stages = [
    { num: 1, label: "Signup & Verify", reward: 150, icon: UserPlus, desc: "Friend signs up and verifies account" },
    { num: 2, label: "Complete Profile", reward: 250, icon: Target, desc: "Profile + first post + reach 100 AURIX" },
    { num: 3, label: "7-Day Streak", reward: 300, icon: Flame, desc: "7 consecutive active days" },
  ];

  const totalPossible = 700;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <Gift className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            Referrals
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Invite friends and earn up to {totalPossible} AURIX per referral
          </p>
        </motion.div>

        {/* Referral link card */}
        <motion.div
          className="glass-card rounded-2xl p-4 md:p-6 mb-6 glow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Your Referral Link
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={referralLink}
              readOnly
              className="bg-muted/30 border-border/30 text-sm font-mono"
            />
            <Button
              onClick={copyCode}
              variant="outline"
              className={cn(
                "shrink-0 transition-all",
                copied && "bg-aura-mint/10 border-aura-mint/30 text-aura-mint"
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Code: <span className="font-mono text-foreground">{profile?.referral_code}</span> · Max 10 referrals/month
          </p>
        </motion.div>

        {/* Milestone stages */}
        <motion.div
          className="glass-card rounded-2xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
            Reward Milestones (per referral)
          </h3>
          <div className="space-y-4">
            {stages.map((stage, i) => (
              <div
                key={stage.num}
                className="flex items-center gap-4 p-3 rounded-xl bg-muted/20 border border-border/20"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <stage.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Stage {stage.num}: {stage.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{stage.desc}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Coins className="w-4 h-4 text-aura-gold" />
                  <span className="font-display font-bold text-foreground">+{stage.reward}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Referral list */}
        <motion.div
          className="glass-card rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="p-4 border-b border-border/30">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Your Referrals ({referrals.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>
          ) : referrals.length === 0 ? (
            <div className="p-8 text-center">
              <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No referrals yet. Share your link to start earning!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {referrals.map((ref, i) => (
                <motion.div
                  key={ref.id}
                  className="p-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-8 h-8 border border-border">
                      <AvatarImage src={ref.referred_profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-muted text-xs font-bold">
                        {ref.referred_profile?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold text-foreground">
                      @{ref.referred_profile?.username || "unknown"}
                    </span>
                    {ref.revoked && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Revoked</span>
                    )}
                  </div>

                  {!ref.revoked && (
                    <div className="flex gap-2">
                      {stages.map((stage) => {
                        const completed = ref[`stage_${stage.num}_completed` as keyof Referral] as boolean;
                        const rewarded = ref[`stage_${stage.num}_rewarded` as keyof Referral] as boolean;

                        return (
                          <div
                            key={stage.num}
                            className={cn(
                              "flex-1 p-2 rounded-lg text-center text-xs border transition-all",
                              rewarded
                                ? "bg-aura-mint/10 border-aura-mint/30 text-aura-mint"
                                : completed
                                  ? "bg-primary/10 border-primary/30 text-primary cursor-pointer hover:bg-primary/20"
                                  : "bg-muted/20 border-border/20 text-muted-foreground"
                            )}
                            onClick={() => completed && !rewarded && claimReward(ref.id, stage.num)}
                          >
                            <p className="font-medium">S{stage.num}</p>
                            <p className="font-bold">+{stage.reward}</p>
                            <p className="mt-0.5">
                              {rewarded ? "✓ Claimed" : completed ? "Claim!" : "Pending"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
