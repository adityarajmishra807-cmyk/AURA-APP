import { useState, useEffect, useCallback } from "react";
import { LeaderboardSkeleton } from "@/components/skeletons/Skeletons";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Trophy, Coins, Flame, Crown, Medal, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { cosmeticProps, nameColorProps } from "@/lib/cosmeticStyles";

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url: string | null;
  aurix_balance: number;
  college_id?: string | null;
  streak_count: number;
}

interface CosmeticInfo {
  frame?: string | null;
  nameColor?: string | null;
  badge?: string | null;
}

interface College {
  id: string;
  name: string;
}

interface LeaderboardProfileRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  aurix_balance: number;
  college_id: string | null;
  streak_count: number;
  equipped_frame: string | null;
  equipped_name_color: string | null;
  equipped_badge: string | null;
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"global" | "college">("global");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeNames, setCollegeNames] = useState<Record<string, string>>({});
  const [selectedCollege, setSelectedCollege] = useState(profile?.college_id || "");
  const [collegeOpen, setCollegeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cosmetics, setCosmetics] = useState<Record<string, CosmeticInfo>>({});

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
  }, [profile, selectedCollege]);

  const loadEntries = useCallback(async () => {
    setLoading(true);

    if (tab === "college" && !selectedCollege) {
      setEntries([]);
      setCosmetics({});
      setLoading(false);
      return;
    }

    let query = supabase
      .from("profiles")
      .select("user_id, username, avatar_url, aurix_balance, college_id, streak_count, equipped_frame, equipped_name_color, equipped_badge")
      .order("aurix_balance", { ascending: false })
      .limit(100);

    if (tab === "college") {
      query = query.eq("college_id", selectedCollege);
    }

    const { data } = await query;
    const rows = (data || []) as LeaderboardProfileRow[];

    const rankedEntries: LeaderboardEntry[] = rows.map((row, index) => ({
      rank: index + 1,
      username: row.username,
      avatar_url: row.avatar_url,
      aurix_balance: row.aurix_balance,
      college_id: row.college_id,
      streak_count: row.streak_count,
    }));

    setEntries(rankedEntries);

    if (rows.length === 0) {
      setCosmetics({});
      setLoading(false);
      return;
    }

    const itemIds = rows
      .flatMap((row) => [row.equipped_frame, row.equipped_name_color, row.equipped_badge])
      .filter(Boolean);

    const itemMap: Record<string, { preview_value: string }> = {};
    if (itemIds.length > 0) {
      const { data: items } = await supabase
        .from("shop_items")
        .select("id, preview_value")
        .in("id", itemIds);
      items?.forEach((item) => {
        itemMap[item.id] = item;
      });
    }

    const cosmeticsMap: Record<string, CosmeticInfo> = {};
    rows.forEach((row) => {
      cosmeticsMap[row.username] = {
        frame: row.equipped_frame ? itemMap[row.equipped_frame]?.preview_value ?? null : null,
        nameColor: row.equipped_name_color ? itemMap[row.equipped_name_color]?.preview_value ?? null : null,
        badge: row.equipped_badge ? itemMap[row.equipped_badge]?.preview_value ?? null : null,
      };
    });

    setCosmetics(cosmeticsMap);
    setLoading(false);
  }, [tab, selectedCollege]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const channel = supabase
      .channel(`leaderboard-realtime-${tab}-${selectedCollege || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          loadEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEntries, tab, selectedCollege]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 md:w-5 md:h-5 text-aura-gold" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-aura-rose" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  const isTopThree = (rank: number) => rank <= 3;

  // Use fallback renderer for cosmetics

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pb-4 md:pb-0">
        <motion.div
          className="mb-4 md:mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-xl md:text-3xl font-bold text-foreground flex items-center gap-2 md:gap-3">
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-aura-gold" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-0.5 md:mt-1 text-xs md:text-base">Top AURIX holders</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
          {(["global", "college"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm font-medium tap-scale"
            >
              {tab === t && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary glow-sm"
                  layoutId="leaderboardTab"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={cn("relative z-10", tab === t ? "text-primary-foreground" : "text-muted-foreground")}>
                {t === "global" ? "Global" : "College"}
              </span>
            </button>
          ))}

          {tab === "college" && (
            <Popover open={collegeOpen} onOpenChange={setCollegeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={collegeOpen}
                  className="w-48 md:w-64 justify-between bg-muted/50 border-border/50 text-sm truncate"
                >
                  <span className="truncate">
                    {selectedCollege
                      ? collegeNames[selectedCollege] || "Select college"
                      : "Select college"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 md:w-80 p-0 z-50 bg-popover" align="start">
                <Command>
                  <CommandInput placeholder="Search college..." />
                  <CommandList className="max-h-60">
                    <CommandEmpty>No college found.</CommandEmpty>
                    <CommandGroup>
                      {colleges.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setSelectedCollege(c.id);
                            setCollegeOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCollege === c.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{c.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Top 3 on mobile - stacked highlight cards */}
        {!loading && entries.length > 0 && entries.some((e) => isTopThree(e.rank)) && (
          <div className="md:hidden space-y-2 mb-4">
            {entries.filter((e) => isTopThree(e.rank)).map((entry) => (
              <motion.div
                key={entry.username}
                className={cn(
                  "glass-card rounded-xl p-3.5 flex items-center gap-3 tap-scale",
                  entry.rank === 1 && "border-aura-gold/30 bg-aura-gold/5",
                  entry.rank === 2 && "border-muted-foreground/20",
                  entry.rank === 3 && "border-aura-rose/20",
                  entry.username === profile?.username && "ring-1 ring-primary/40"
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: entry.rank * 0.08 }}
              >
                <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
                <Link to={`/profile/${entry.username}`}>
                  <div className="relative">
                    <Avatar {...cosmeticProps("w-10 h-10 border border-border", cosmetics[entry.username]?.frame)}>
                      <AvatarImage src={entry.avatar_url || ""} />
                      <AvatarFallback className="bg-muted text-xs font-bold">
                        {entry.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${entry.username}`} className="text-sm font-semibold truncate flex items-center gap-1">
                    <span
                      {...nameColorProps("text-foreground inline-block", cosmetics[entry.username]?.nameColor)}
                    >
                      @{entry.username}
                    </span>
                    {cosmetics[entry.username]?.badge && <span className="text-sm">{cosmetics[entry.username].badge}</span>}
                    {entry.username === profile?.username && (
                      <span className="text-xs text-primary ml-1">(you)</span>
                    )}
                  </Link>
                </div>
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-aura-gold" />
                  <span className="font-display font-bold text-sm text-foreground">
                    {entry.aurix_balance.toLocaleString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Leaderboard list */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <LeaderboardSkeleton />
          ) : entries.length === 0 ? (
            <div className="p-6 md:p-8 text-center text-muted-foreground text-sm">No entries yet</div>
          ) : (
            <div className="divide-y divide-border/30">
              {entries
                .filter((e) => {
                  if (isMobile && isTopThree(e.rank)) return false;
                  return true;
                })
                .map((entry, i) => (
                <motion.div
                  key={entry.username}
                  className={cn(
                    "flex items-center gap-3 md:gap-4 p-3 md:p-4 transition-colors tap-scale",
                    entry.username === profile?.username && "bg-primary/5 border-l-2 border-primary"
                  )}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                >
                  <div className="w-6 md:w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <Link to={`/profile/${entry.username}`}>
                    <Avatar {...cosmeticProps("w-8 h-8 md:w-9 md:h-9 border border-border", cosmetics[entry.username]?.frame)}>
                      <AvatarImage src={entry.avatar_url || ""} />
                      <AvatarFallback className="bg-muted text-[10px] md:text-xs font-bold">
                        {entry.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${entry.username}`} className="text-xs md:text-sm font-semibold truncate flex items-center gap-1">
                      <span
                        {...nameColorProps("text-foreground truncate inline-block max-w-full", cosmetics[entry.username]?.nameColor)}
                      >
                        @{entry.username}
                      </span>
                      {cosmetics[entry.username]?.badge && <span className="text-xs md:text-sm">{cosmetics[entry.username].badge}</span>}
                      {entry.username === profile?.username && (
                        <span className="text-[10px] md:text-xs text-primary ml-1">(you)</span>
                      )}
                    </Link>
                    {tab === "global" && entry.college_id && collegeNames[entry.college_id] && (
                      <p className="text-[10px] md:text-xs text-muted-foreground truncate">{collegeNames[entry.college_id]}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    {entry.streak_count > 0 && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className="w-3 h-3 text-accent" />
                        {entry.streak_count}d
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 md:w-4 md:h-4 text-aura-gold" />
                      <span className="font-display font-bold text-xs md:text-base text-foreground">
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
