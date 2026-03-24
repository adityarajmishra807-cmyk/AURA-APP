import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Save, Gift, Download, LogOut, Award, ShoppingBag, Sparkles, Pencil, Check, X, Target } from "lucide-react";
import { toast } from "sonner";
import { validateContent } from "@/lib/profanityFilter";

import { AvatarSection } from "@/components/settings/AvatarSection";
import { GlowInput } from "@/components/settings/GlowInput";
import { GlowSelect } from "@/components/settings/GlowSelect";
import { StatCards } from "@/components/settings/StatCards";
import { VibeSelector } from "@/components/settings/VibeSelector";
import { InterestTags } from "@/components/settings/InterestTags";

interface College {
  id: string;
  name: string;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not", label: "Prefer not to say" },
  { value: "custom", label: "Custom" },
];

const PRONOUNS_OPTIONS = [
  { value: "he/him", label: "he/him" },
  { value: "she/her", label: "she/her" },
  { value: "they/them", label: "they/them" },
  { value: "custom", label: "Custom" },
];

const YEAR_OPTIONS = [
  { value: "1st", label: "1st Year" },
  { value: "2nd", label: "2nd Year" },
  { value: "3rd", label: "3rd Year" },
  { value: "4th", label: "4th Year" },
];

const BRANCH_OPTIONS = [
  { value: "CSE", label: "CSE" },
  { value: "AI", label: "AI / ML" },
  { value: "ECE", label: "ECE" },
  { value: "ME", label: "Mechanical" },
  { value: "CE", label: "Civil" },
  { value: "EE", label: "Electrical" },
  { value: "IT", label: "IT" },
  { value: "BioTech", label: "BioTech" },
  { value: "Other", label: "Other" },
];

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [bio, setBio] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [colleges, setColleges] = useState<College[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [branch, setBranch] = useState("");
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);

  const canChangeUsername = (() => {
    if (!profile?.username_changed_at) return true;
    const changed = new Date(profile.username_changed_at).getTime();
    return Date.now() - changed > 7 * 24 * 60 * 60 * 1000;
  })();

  const nextUsernameChangeDate = profile?.username_changed_at
    ? new Date(new Date(profile.username_changed_at).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;

  const handleUsernameChange = async () => {
    if (!user || !newUsername.trim()) return;
    const trimmed = newUsername.trim().toLowerCase().replace(/\s+/g, "_");
    if (trimmed.length < 3) { toast.error("Username must be at least 3 characters"); return; }
    if (trimmed.length > 20) { toast.error("Username must be 20 characters or less"); return; }
    if (!/^[a-z0-9_]+$/.test(trimmed)) { toast.error("Only letters, numbers and underscores allowed"); return; }
    const profanityErr = validateContent(trimmed);
    if (profanityErr) { toast.error(profanityErr); return; }

    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", trimmed)
      .neq("user_id", user.id)
      .maybeSingle();
    if (existing) { toast.error("Username already taken"); return; }

    setUsernameSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: trimmed, username_changed_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to change username");
    } else {
      await refreshProfile();
      toast.success("Username changed! ✨");
      setEditingUsername(false);
    }
    setUsernameSaving(false);
  };

  useEffect(() => {
    supabase.from("colleges").select("id, name").order("name").then(({ data }) => {
      if (data) setColleges(data);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setCollegeId(profile.college_id || "");
      setAvatarUrl(profile.avatar_url);
      setGender(profile.gender || "");
      setPronouns(profile.pronouns || "");
      setAcademicYear(profile.academic_year || "");
      setBranch(profile.branch || "");
      setVibeTags(profile.vibe_tags || []);
      setInterests(profile.interests || []);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    // Profanity check on bio
    const bioCheck = validateContent(bio);
    if (bioCheck) {
      toast.error(bioCheck);
      return;
    }

    setSaving(true);

    const updates: Record<string, any> = {
      bio,
      avatar_url: avatarUrl,
      gender: gender || null,
      pronouns: pronouns || null,
      academic_year: academicYear || null,
      branch: branch || null,
      vibe_tags: vibeTags,
      interests,
    };

    if (collegeId !== profile?.college_id) {
      updates.college_id = collegeId || null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save");
    } else {
      await refreshProfile();
      toast.success("Settings saved ✨");
    }
    setSaving(false);
  };

  const collegeOptions = colleges.map((c) => ({ value: c.id, label: c.name }));

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.05 * i, type: "spring" as const, stiffness: 200, damping: 20 },
    }),
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Edit Profile
            </h1>
            <Sparkles className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-muted-foreground text-sm">Craft your identity</p>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative rounded-2xl overflow-hidden"
        >
          {/* Gradient border glow */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-blue-500/30 opacity-60" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />

          <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-5 md:p-8 space-y-8">

            {/* 1. Avatar */}
            <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible">
              <AvatarSection
                avatarUrl={avatarUrl}
                username={profile?.username}
                userId={user?.id}
                onAvatarChange={setAvatarUrl}
              />
            </motion.div>

            {/* 2. Username */}
            <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
              {editingUsername ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Username</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 group">
                      <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 opacity-100 blur-sm" />
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-purple-400/70 text-sm font-medium pointer-events-none z-10">@</span>
                        <input
                          autoFocus
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                          maxLength={20}
                          placeholder="new_username"
                          className="w-full pl-8 pr-3 py-2 rounded-md bg-background/50 border border-purple-500/50 text-foreground text-sm outline-none placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={usernameSaving || !newUsername.trim()}
                      onClick={handleUsernameChange}
                      className="h-9 w-9 text-green-400 hover:bg-green-500/10 shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingUsername(false)}
                      className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">3-20 chars, letters, numbers & underscores only</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Username</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative group">
                      <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 opacity-0 blur-sm" />
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-purple-400/70 text-sm font-medium pointer-events-none z-10">@</span>
                        <input
                          disabled
                          value={profile?.username || ""}
                          className="w-full pl-8 pr-3 py-2 rounded-md bg-background/50 border border-border/30 text-foreground text-sm disabled:opacity-70"
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={!canChangeUsername}
                      onClick={() => { setNewUsername(profile?.username || ""); setEditingUsername(true); }}
                      className="h-9 w-9 text-purple-400 hover:bg-purple-500/10 shrink-0 disabled:opacity-40"
                      title={canChangeUsername ? "Change username" : "Available after cooldown"}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">
                    {canChangeUsername
                      ? "You can change your username (once per week)"
                      : `Next change available ${nextUsernameChangeDate?.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                  </p>
                </div>
              )}
            </motion.div>

            {/* 3. Bio */}
            <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
              <GlowInput
                label="Bio"
                id="bio"
                value={bio}
                onChange={setBio}
                placeholder="Describe your vibe..."
                maxLength={160}
                multiline
                counter
              />
            </motion.div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

            {/* 4. Identity */}
            <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible" className="space-y-4">
              <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-6 h-px bg-purple-500/40" />
                Identity
                <span className="w-6 h-px bg-purple-500/40" />
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <GlowSelect
                  label="Gender"
                  value={gender}
                  onValueChange={setGender}
                  placeholder="Select"
                  options={GENDER_OPTIONS}
                />
                <GlowSelect
                  label="Pronouns"
                  value={pronouns}
                  onValueChange={setPronouns}
                  placeholder="Select"
                  options={PRONOUNS_OPTIONS}
                />
              </div>
            </motion.div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

            {/* 5. Academic Info */}
            <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible" className="space-y-4">
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-6 h-px bg-blue-500/40" />
                Academic
                <span className="w-6 h-px bg-blue-500/40" />
              </h3>
              <GlowSelect
                label="College"
                value={collegeId}
                onValueChange={setCollegeId}
                placeholder="Search your college"
                options={collegeOptions}
                hint="You can change this anytime"
              />
              <div className="grid grid-cols-2 gap-4">
                <GlowSelect
                  label="Year"
                  value={academicYear}
                  onValueChange={setAcademicYear}
                  placeholder="Select"
                  options={YEAR_OPTIONS}
                />
                <GlowSelect
                  label="Branch"
                  value={branch}
                  onValueChange={setBranch}
                  placeholder="Select"
                  options={BRANCH_OPTIONS}
                />
              </div>
            </motion.div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

            {/* 6. Gamified Stats */}
            <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                <span className="w-6 h-px bg-amber-500/40" />
                Stats
                <span className="w-6 h-px bg-amber-500/40" />
              </h3>
              <StatCards
                aurixBalance={profile?.aurix_balance ?? 0}
                streakCount={profile?.streak_count ?? 0}
              />
            </motion.div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

            {/* 7. Vibe System */}
            <motion.div custom={6} variants={sectionVariants} initial="hidden" animate="visible">
              <VibeSelector selected={vibeTags} onChange={setVibeTags} />
            </motion.div>

            {/* 8. Interests */}
            <motion.div custom={7} variants={sectionVariants} initial="hidden" animate="visible">
              <InterestTags tags={interests} onChange={setInterests} />
            </motion.div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

            {/* Save Button */}
            <motion.div custom={8} variants={sectionVariants} initial="hidden" animate="visible">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 text-base font-semibold relative overflow-hidden group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                {saving ? (
                  <span className="animate-pulse">Saving...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </motion.div>

            {/* Quick links */}
            <motion.div custom={9} variants={sectionVariants} initial="hidden" animate="visible">
              <div className="grid grid-cols-2 gap-3">
                <Link to="/shop">
                  <Button variant="outline" className="w-full h-11 gap-2 border-border/30 bg-background/30 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all">
                    <ShoppingBag className="w-4 h-4" />
                    AURIX Shop
                  </Button>
                </Link>
                <Link to="/achievements">
                  <Button variant="outline" className="w-full h-11 gap-2 border-border/30 bg-background/30 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all">
                    <Award className="w-4 h-4" />
                    Badges
                  </Button>
                </Link>
                <Link to="/referrals">
                  <Button variant="outline" className="w-full h-11 gap-2 border-border/30 bg-background/30 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all">
                    <Gift className="w-4 h-4" />
                    Referrals
                  </Button>
                </Link>
                <Link to="/install">
                  <Button variant="outline" className="w-full h-11 gap-2 border-border/30 bg-background/30 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all">
                    <Download className="w-4 h-4" />
                    Install App
                  </Button>
                </Link>
                <Link to="/spin">
                  <Button variant="outline" className="w-full h-11 gap-2 border-border/30 bg-background/30 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all">
                    <Target className="w-4 h-4" />
                    Daily Spin
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Sign Out */}
            <motion.div custom={10} variants={sectionVariants} initial="hidden" animate="visible">
              <Button
                variant="ghost"
                className="w-full h-11 text-destructive hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all"
                onClick={() => supabase.auth.signOut()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
