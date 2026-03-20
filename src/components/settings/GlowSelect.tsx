import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GlowSelectProps {
  label: string;
  value: string;
  onValueChange: (val: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  hint?: string;
}

export function GlowSelect({ label, value, onValueChange, placeholder, options, hint }: GlowSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative group">
        <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="relative bg-background/50 border-border/30 focus:border-purple-500/50 text-foreground transition-all duration-300">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/30 backdrop-blur-xl">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="focus:bg-purple-500/10">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}
