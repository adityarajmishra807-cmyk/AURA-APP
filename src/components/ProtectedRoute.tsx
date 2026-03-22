import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuraLoader } from "@/components/ui/AuraLoader";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <AuraLoader />;
  }

  if (!session) return <Navigate to="/auth" replace />;
  
  // If session exists but profile hasn't loaded yet (Google OAuth delay), show loader
  if (!profile) return <AuraLoader />;
  
  if (!profile.college_id) return <Navigate to="/profile-setup" replace />;

  return <>{children}</>;
}
