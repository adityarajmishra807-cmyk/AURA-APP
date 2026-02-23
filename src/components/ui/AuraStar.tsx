import { cn } from "@/lib/utils";

interface AuraStarProps {
  className?: string;
}

export function AuraStar({ className }: AuraStarProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-4 h-4", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C12 0 14 8.5 12 12C10 8.5 12 0 12 0Z" />
      <path d="M12 24C12 24 14 15.5 12 12C10 15.5 12 24 12 24Z" />
      <path d="M0 12C0 12 8.5 10 12 12C8.5 14 0 12 0 12Z" />
      <path d="M24 12C24 12 15.5 10 12 12C15.5 14 24 12 24 12Z" />
    </svg>
  );
}
