import { Navigate } from "react-router-dom";

// Battles are now accessed via the Chat page's Battles tab
export default function Battles() {
  return <Navigate to="/chat" replace />;
}
