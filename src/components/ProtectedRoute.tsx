import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center glow animate-pulse">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!profile?.college_id) return <Navigate to="/profile-setup" replace />;

  return <>{children}</>;
}
