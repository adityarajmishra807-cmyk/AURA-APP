import { cn } from "@/lib/utils";

interface AuraLogoProps {
  className?: string;
}

export function AuraLogo({ className }: AuraLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("w-4 h-4", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.9" />
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="12" cy="12" r="11.5" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
    </svg>
  );
}
