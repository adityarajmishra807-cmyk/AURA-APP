import { cn } from "@/lib/utils";

const data = [
  { label: "Mon", value: 65 },
  { label: "Tue", value: 80 },
  { label: "Wed", value: 45 },
  { label: "Thu", value: 90 },
  { label: "Fri", value: 70 },
  { label: "Sat", value: 55 },
  { label: "Sun", value: 85 },
];

export function MiniChart() {
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="font-display text-lg font-semibold text-foreground mb-1">
        Weekly Overview
      </h3>
      <p className="text-sm text-muted-foreground mb-6">User engagement this week</p>
      <div className="flex items-end gap-2 h-40">
        {data.map((item, i) => (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full relative rounded-t-md overflow-hidden" style={{ height: `${(item.value / max) * 100}%` }}>
              <div
                className={cn(
                  "absolute inset-0 gradient-primary opacity-70 hover:opacity-100 transition-opacity duration-300 rounded-t-md"
                )}
              />
            </div>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
