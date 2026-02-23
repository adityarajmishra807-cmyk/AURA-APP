import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import storyFrame from "@/assets/story-frame.png";
import { useAuth } from "@/contexts/AuthContext";
import { useStories, StoryGroup } from "@/hooks/useStories";
import { StoryViewer } from "./StoryViewer";
import { CreateStoryDialog } from "./CreateStoryDialog";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function StoryBar() {
  const { user, profile } = useAuth();
  const { storyGroups, loading, markViewed, reactToStory, uploadStory, viewedStoryIds, fetchStories } = useStories();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleOpenStory = (index: number) => {
    setActiveGroupIndex(index);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
  };

  // Get ring color based on AURIX balance
  const getRingGradient = (balance: number, hasUnviewed: boolean, isViewed: boolean) => {
    if (isViewed && !hasUnviewed) return "from-muted-foreground/30 to-muted-foreground/20";
    if (balance >= 5000) return "from-aura-gold via-yellow-400 to-amber-500";
    if (balance >= 1000) return "from-primary via-purple-400 to-accent";
    return "from-primary to-primary/60";
  };

  const currentUserHasStory = storyGroups.some((g) => g.user_id === user?.id);

  if (loading) {
    return (
      <div className="flex gap-3 px-1 py-3 overflow-x-auto scrollbar-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="w-10 h-2 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="flex gap-3 px-1 py-3 overflow-x-auto scrollbar-none"
      >
        {/* Add Story button */}
        {!currentUserHasStory && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-1.5 shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            <div className="relative w-[72px] h-[72px]">
              {/* Leaf frame */}
              <img src={storyFrame} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" />
              {/* Avatar centered inside */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="w-11 h-11 rounded-full">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-muted text-sm font-display font-bold">
                    {profile?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background z-20">
                <Plus className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            </div>
            <span className="text-[8px] text-muted-foreground font-medium w-16 text-center truncate">
              Aura Moment
            </span>
          </motion.button>
        )}

        {/* Story groups */}
        {storyGroups.map((group, i) => {
          const isOwn = group.user_id === user?.id;
          const ringGradient = getRingGradient(group.aurix_balance, group.hasUnviewed, !group.hasUnviewed);
          const isHighTier = group.aurix_balance >= 5000;

          return (
            <motion.button
              key={group.user_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
              onClick={() => {
                if (isOwn && group.stories.length === 0) {
                  setCreateOpen(true);
                } else {
                  handleOpenStory(i);
                }
              }}
            >
              <div className="relative w-[72px] h-[72px]">
                {/* Leaf frame */}
                <img
                  src={storyFrame}
                  alt=""
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover pointer-events-none z-10 transition-all duration-300",
                    !group.hasUnviewed && "opacity-40 grayscale",
                    group.hasUnviewed && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.3)]",
                    isHighTier && group.hasUnviewed && "animate-[pulse_3s_ease-in-out_infinite]"
                  )}
                />
                {/* Avatar centered */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Avatar className="w-11 h-11 rounded-full">
                    <AvatarImage src={group.avatar_url || ""} />
                    <AvatarFallback className="bg-muted text-sm font-display font-bold">
                      {group.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {/* Add button for own story */}
                {isOwn && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background cursor-pointer z-20"
                    onClick={(e) => { e.stopPropagation(); setCreateOpen(true); }}
                  >
                    <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium w-16 text-center truncate",
                group.hasUnviewed ? "text-foreground" : "text-muted-foreground"
              )}>
                {isOwn ? "Aura Moment" : group.username}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Story viewer */}
      <AnimatePresence>
        {viewerOpen && storyGroups.length > 0 && (
          <StoryViewer
            groups={storyGroups}
            initialGroupIndex={activeGroupIndex}
            onClose={handleCloseViewer}
            onViewed={markViewed}
            onReact={reactToStory}
            viewedStoryIds={viewedStoryIds}
          />
        )}
      </AnimatePresence>

      {/* Create story dialog */}
      <CreateStoryDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onUpload={uploadStory}
      />
    </>
  );
}
