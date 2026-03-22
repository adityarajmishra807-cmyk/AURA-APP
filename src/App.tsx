import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineBadge } from "@/components/pwa/OfflineBadge";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import Leaderboard from "./pages/Leaderboard";
import Transfer from "./pages/Transfer";
import Referrals from "./pages/Referrals";
import Settings from "./pages/Settings";
import UserProfile from "./pages/UserProfile";
import Chat from "./pages/Chat";
import ChatRoom from "./pages/ChatRoom";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Install from "./pages/Install";
import Achievements from "./pages/Achievements";
import Shop from "./pages/Shop";
import Battles from "./pages/Battles";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineBadge />
      <BrowserRouter>
        <AuthProvider>
          <InstallPrompt />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
            <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/chat/:conversationId" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
            <Route path="/profile/:username" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/install" element={<ProtectedRoute><Install /></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
            <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
