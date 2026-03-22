import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ConversationList } from "@/components/chat/ConversationList";
import { BattlesPanel } from "@/components/battles/BattlesPanel";
import { MessageCircle, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBattles } from "@/hooks/useBattles";

type ChatTab = "messages" | "battles";

export default function Chat() {
  const [tab, setTab] = useState<ChatTab>("messages");
  const { battles } = useBattles();
  const pendingCount = battles.filter(b => b.status === "pending").length;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] flex flex-col">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-card/50 border border-border/20 mb-3 shrink-0">
          {([
            { key: "messages" as ChatTab, label: "Messages", icon: MessageCircle, badge: 0 },
            { key: "battles" as ChatTab, label: "Battles", icon: Swords, badge: pendingCount },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {tab === t.key && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/30"
                  layoutId="chatTab"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={cn("relative z-10 flex items-center gap-2", tab === t.key ? "text-primary" : "text-muted-foreground")}>
                <t.icon className="w-4 h-4" />
                {t.label}
                {t.badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                    {t.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {tab === "messages" ? <ConversationList /> : <BattlesPanel />}
        </div>
      </div>
    </DashboardLayout>
  );
}
