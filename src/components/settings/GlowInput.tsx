import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface GlowInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  multiline?: boolean;
  prefix?: string;
  rows?: number;
  hint?: string;
  counter?: boolean;
}

export function GlowInput({
  label, id, value, onChange, placeholder, disabled, maxLength,
  multiline, prefix, rows = 3, hint, counter,
}: GlowInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative group">
        <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
        {multiline ? (
          <Textarea
            id={id}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            rows={rows}
            disabled={disabled}
            className="relative bg-background/50 border-border/30 focus:border-purple-500/50 resize-none text-foreground placeholder:text-muted-foreground/50 transition-all duration-300"
          />
        ) : (
          <div className="relative flex items-center">
            {prefix && (
              <span className="absolute left-3 text-purple-400/70 text-sm font-medium pointer-events-none z-10">
                {prefix}
              </span>
            )}
            <Input
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              className={cn(
                "relative bg-background/50 border-border/30 focus:border-purple-500/50 text-foreground placeholder:text-muted-foreground/50 transition-all duration-300",
                prefix && "pl-8"
              )}
            />
          </div>
        )}
      </div>
      <div className="flex justify-between">
        {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
        {counter && maxLength && (
          <p className={cn(
            "text-[11px] ml-auto tabular-nums",
            value.length >= maxLength ? "text-pink-400" : "text-muted-foreground/60"
          )}>
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
