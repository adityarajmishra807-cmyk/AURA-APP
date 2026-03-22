import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfilePictureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  username: string;
}

export function ProfilePictureModal({ open, onOpenChange, imageUrl, username }: ProfilePictureModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-fit p-0 bg-transparent border-none shadow-none [&>button]:hidden flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col items-center gap-3"
        >
          <Avatar className="w-64 h-64 md:w-72 md:h-72 border-4 border-primary/30 shadow-2xl">
            <AvatarImage src={imageUrl || ""} className="object-cover" />
            <AvatarFallback className="bg-muted text-4xl font-display font-bold">
              {username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-foreground font-semibold text-lg">@{username}</span>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}