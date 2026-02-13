import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full gradient-aura">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto pb-20 md:pb-8">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
