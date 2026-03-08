import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-muted/60 animate-pulse",
        className
      )}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bone className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-3.5 w-28" />
          <Bone className="h-2.5 w-20" />
        </div>
        <Bone className="h-8 w-16 rounded-lg" />
      </div>
      {/* Body */}
      <div className="space-y-2">
        <Bone className="h-3.5 w-full" />
        <Bone className="h-3.5 w-4/5" />
        <Bone className="h-3.5 w-2/3" />
      </div>
      {/* Image placeholder (50% chance visually) */}
      <Bone className="h-44 w-full rounded-xl" />
      {/* Actions */}
      <div className="flex gap-4">
        <Bone className="h-5 w-14 rounded-full" />
        <Bone className="h-5 w-14 rounded-full" />
      </div>
      {/* Rating bar */}
      <div className="border-t border-border/20 pt-3">
        <Bone className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function PostFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl">
      <Bone className="w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Bone className="h-4 w-28" />
          <Bone className="h-3 w-10" />
        </div>
        <Bone className="h-3 w-44" />
      </div>
    </div>
  );
}

export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 p-1">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}

export function StoryBarSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-3 px-1 py-3 overflow-x-auto scrollbar-none">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
          <Bone className="w-[72px] h-[72px] rounded-full" />
          <Bone className="w-12 h-2.5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function LeaderboardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/20">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 md:p-4">
          <Bone className="w-6 h-6 rounded" />
          <Bone className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3.5 w-24" />
            <Bone className="h-2.5 w-16" />
          </div>
          <Bone className="h-5 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 md:p-8 space-y-6">
      <div className="flex items-start gap-4 md:gap-6">
        <Bone className="w-16 h-16 md:w-20 md:h-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Bone className="h-5 w-36" />
          <Bone className="h-3 w-52" />
          <Bone className="h-3 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl bg-muted/20 p-3 space-y-2 flex flex-col items-center">
            <Bone className="w-4 h-4 rounded" />
            <Bone className="h-5 w-16" />
            <Bone className="h-2 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShopItemSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Bone className="w-16 h-16 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-12 rounded-full" />
          </div>
          <Bone className="h-3 w-full" />
          <div className="flex gap-3">
            <Bone className="h-3 w-12" />
            <Bone className="h-3 w-16" />
          </div>
        </div>
      </div>
      <Bone className="h-8 w-full rounded-lg" />
    </div>
  );
}

export function ShopGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShopItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function AchievementSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="flex items-start gap-3 md:gap-4">
        <Bone className="w-12 h-12 md:w-14 md:h-14 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Bone className="h-4 w-28" />
            <Bone className="w-4 h-4 rounded-full" />
          </div>
          <Bone className="h-3 w-full" />
          <Bone className="h-2 w-full rounded-full mt-2" />
          <div className="flex justify-between">
            <Bone className="h-2 w-10" />
            <Bone className="h-2 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AchievementGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AchievementSkeleton key={i} />
      ))}
    </div>
  );
}
