import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, string> = {
  rating_received: "⭐",
  friend_request: "👋",
  friend_accepted: "🎉",
  transfer_received: "💰",
  streak_milestone: "🔥",
  referral_reward: "🎁",
  post_reward: "✨",
  new_message: "💬",
};

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer group",
        notification.read
          ? "bg-transparent hover:bg-muted/40"
          : "bg-primary/5 hover:bg-primary/10 border border-primary/10"
      )}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      <span className="text-lg mt-0.5 shrink-0">
        {typeIcons[notification.type] || "🔔"}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", !notification.read && "text-foreground")}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notification.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPushPermission,
  } = useNotifications();

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if ("Notification" in window && Notification.permission === "default") {
            requestPushPermission();
          }
        }}
        className="relative p-3 md:p-2 rounded-xl hover:bg-muted/60 transition-colors tap-scale"
      >
        <Bell className="w-5 h-5 text-foreground" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            {/* Dropdown */}
            <motion.div
              className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] z-50 rounded-2xl border border-border bg-popover shadow-xl overflow-hidden flex flex-col"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-display font-bold text-sm">Notifications</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Read all
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {notifications.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
