import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "success" | "info" | "warning";
}

const typeStyles = {
  success: "bg-aura-mint/20 border-aura-mint/30",
  info: "bg-primary/10 border-primary/20",
  warning: "bg-aura-rose/10 border-aura-rose/20",
};

const dotStyles = {
  success: "bg-aura-mint",
  info: "bg-primary",
  warning: "bg-aura-rose",
};

const activities: ActivityItem[] = [
  { id: "1", title: "New user signed up", description: "sarah@email.com joined the platform", time: "2 min ago", type: "success" },
  { id: "2", title: "Report generated", description: "Monthly analytics report is ready", time: "15 min ago", type: "info" },
  { id: "3", title: "Storage limit warning", description: "Team workspace at 85% capacity", time: "1 hour ago", type: "warning" },
  { id: "4", title: "Integration connected", description: "Slack workspace linked successfully", time: "3 hours ago", type: "success" },
  { id: "5", title: "New feature deployed", description: "Dashboard v2.4 is now live", time: "5 hours ago", type: "info" },
];

export function ActivityFeed() {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="font-display text-lg font-semibold text-foreground mb-5">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {activities.map((item, i) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 hover:translate-x-1",
              typeStyles[item.type],
              "opacity-0 animate-fade-in"
            )}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", dotStyles[item.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
