import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Coins, Flame, Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url: string | null;
  aurix_balance: number;
  college_id?: string;
  streak_count: number;
}

interface College {
  id: string;
  name: string;
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"global" | "college">("global");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeNames, setCollegeNames] = useState<Record<string, string>>({});
  const [selectedCollege, setSelectedCollege] = useState(profile?.college_id || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("colleges").select("id, name").order("name").then(({ data }) => {
      if (data) {
        setColleges(data);
        const map: Record<string, string> = {};
        data.forEach((c) => { map[c.id] = c.name; });
        setCollegeNames(map);
      }
    });
  }, []);

  useEffect(() => {
    if (profile?.college_id && !selectedCollege) {
      setSelectedCollege(profile.college_id);
    }
  }, [profile]);

  useEffect(() => {
    setLoading(true);
    if (tab === "global") {
      supabase.rpc("get_leaderboard", { p_limit: 100 }).then(({ data }) => {
        setEntries((data as any[]) || []);
        setLoading(false);
      });
    } else if (selectedCollege) {
      supabase.rpc("get_college_leaderboard", {
        p_college_id: selectedCollege,
        p_limit: 100,
      }).then(({ data }) => {
        setEntries((data as any[]) || []);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [tab, selectedCollege]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-aura-gold" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-aura-rose" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <Trophy className="w-7 h-7 md:w-8 md:h-8 text-aura-gold" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Top AURIX holders</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-6">
          <button
            onClick={() => setTab("global")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "global" ? "bg-primary text-primary-foreground glow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Global
          </button>
          <button
            onClick={() => setTab("college")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "college" ? "bg-primary text-primary-foreground glow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            College
          </button>

          {tab === "college" && (
            <Select value={selectedCollege} onValueChange={setSelectedCollege}>
              <SelectTrigger className="w-48 bg-muted/50 border-border/50">
                <SelectValue placeholder="Select college" />
              </SelectTrigger>
              <SelectContent>
                {colleges.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Leaderboard list */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading rankings...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No entries yet</div>
          ) : (
            <div className="divide-y divide-border/30">
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.username}
                  className={cn(
                    "flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors",
                    entry.username === profile?.username && "bg-primary/5 border-l-2 border-primary"
                  )}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <Avatar className="w-9 h-9 border border-border">
                    <AvatarImage src={entry.avatar_url || ""} />
                    <AvatarFallback className="bg-muted text-xs font-bold">
                      {entry.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      @{entry.username}
                      {entry.username === profile?.username && (
                        <span className="text-xs text-primary ml-2">(you)</span>
                      )}
                    </p>
                    {tab === "global" && entry.college_id && collegeNames[entry.college_id] && (
                      <p className="text-xs text-muted-foreground">{collegeNames[entry.college_id]}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.streak_count > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className="w-3 h-3 text-accent" />
                        {entry.streak_count}d
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-aura-gold" />
                      <span className="font-display font-bold text-foreground">
                        {entry.aurix_balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
