import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Eye, EyeOff, Gift } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { session, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";

  const [isSignUp, setIsSignUp] = useState(!!refCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState(refCode);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signUp, signIn } = useAuth();

  if (loading) return <LoadingScreen />;
  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      if (username.length < 3) {
        toast.error("Username must be at least 3 characters");
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, username);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to verify your account!");

        // Register referral if code provided (after a short delay for profile creation)
        if (referralCode.trim()) {
          setTimeout(async () => {
            const { data } = await supabase.rpc("register_referral", {
              p_referral_code: referralCode.trim(),
            });
            const result = data as any;
            if (result?.success) {
              toast.success("Referral registered! 🎉");
            }
          }, 2000);
        }
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-aura p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center glow">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient mb-2">Aura</h1>
          <p className="text-muted-foreground">
            {isSignUp ? "Create your account and start earning AURIX" : "Welcome back. Your AURIX awaits."}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 glow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Pick a unique handle"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-muted/50 border-border/50 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referral" className="flex items-center gap-1.5">
                    <Gift className="w-3 h-3 text-primary" />
                    Referral Code
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="referral"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="bg-muted/50 border-border/50 focus:border-primary font-mono"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted/50 border-border/50 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-muted/50 border-border/50 focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground font-semibold h-11 glow-sm"
              disabled={submitting}
            >
              {submitting ? (
                <span className="animate-pulse">Please wait...</span>
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button
                onClick={async () => {
                  if (!email.trim()) {
                    toast.error("Enter your email first");
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) {
                    toast.error(error.message);
                  } else {
                    toast.success("Password reset link sent to your email!");
                  }
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center glow animate-pulse">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground text-sm animate-pulse">Loading Aura...</p>
      </div>
    </div>
  );
}
