import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface ProfilePictureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  username: string;
}

export function ProfilePictureModal({ open, onOpenChange, imageUrl, username }: ProfilePictureModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 bg-transparent border-none shadow-none [&>button]:text-white [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:p-1">
        <motion.div
          className="flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${username}'s profile picture`}
              className="w-72 h-72 md:w-80 md:h-80 rounded-full object-cover border-4 border-primary/30 shadow-2xl"
            />
          ) : (
            <div className="w-72 h-72 md:w-80 md:h-80 rounded-full bg-muted border-4 border-primary/30 shadow-2xl flex items-center justify-center">
              <span className="text-6xl font-display font-bold text-muted-foreground">
                {username?.[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}