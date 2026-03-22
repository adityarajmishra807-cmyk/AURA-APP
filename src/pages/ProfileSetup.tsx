import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { validateContent } from "@/lib/profanityFilter";

interface College {
  id: string;
  name: string;
}

export default function ProfileSetup() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [colleges, setColleges] = useState<College[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("colleges").select("id, name").order("name").then(({ data }) => {
      if (data) setColleges(data);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setCollegeId(profile.college_id || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.college_id) return <Navigate to="/" replace />;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be under 20MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(publicUrl);
    setUploading(false);
    toast.success("Avatar uploaded!");
  };

  const handleSave = async () => {
    if (!username.trim() || username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      toast.error("Username can only contain letters, numbers, and underscores");
      return;
    }
    if (!collegeId) {
      toast.error("Please select your college");
      return;
    }
    const usernameCheck = validateContent(username);
    if (usernameCheck) {
      toast.error(usernameCheck);
      return;
    }
    const bioCheck = validateContent(bio);
    if (bioCheck) {
      toast.error(bioCheck);
      return;
    }
    setSaving(true);

    // Check if username is taken (if changed)
    if (username.trim() !== profile?.username) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.trim())
        .neq("user_id", user!.id)
        .maybeSingle();
      if (existing) {
        toast.error("Username is already taken");
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        bio,
        college_id: collegeId,
        avatar_url: avatarUrl,
        college_changed_at: new Date().toISOString(),
      })
      .eq("user_id", user!.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      await refreshProfile();
      toast.success("Profile complete! Welcome to Aura ✨");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-aura p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-primary/8 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full bg-aura-gold/8 blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      <div className="w-full max-w-lg relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Complete Your Profile</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Set up your Aura
          </h1>
          <p className="text-muted-foreground mt-1">Pick your college and customize your look</p>
        </div>

        <div className="glass-card rounded-2xl p-8 glow-sm space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={avatarUrl || ""} />
                <AvatarFallback className="bg-muted text-2xl font-display font-bold">
                  {profile?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-6 h-6 text-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Click to upload avatar"}</p>
          </div>

          {/* Username (editable) */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Pick a unique username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              maxLength={20}
              className="bg-muted/50 border-border/50 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Letters, numbers, and underscores only</p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell the world about your aura..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              className="bg-muted/50 border-border/50 focus:border-primary resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/160</p>
          </div>

          {/* College */}
          <div className="space-y-2">
            <Label>College</Label>
            <Select value={collegeId} onValueChange={setCollegeId}>
              <SelectTrigger className="bg-muted/50 border-border/50">
                <SelectValue placeholder="Select your college" />
              </SelectTrigger>
              <SelectContent>
                {colleges.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">You can change your college anytime</p>
          </div>

          <Button
            onClick={handleSave}
            className="w-full gradient-primary text-primary-foreground font-semibold h-11 glow-sm"
            disabled={saving}
          >
            {saving ? "Saving..." : (
              <>
                Complete Setup
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
