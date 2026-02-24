import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useShop, ShopItem } from "@/hooks/useShop";
import { clearCosmeticsCache } from "@/hooks/useCosmetics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Coins, ShoppingBag, Check, Sparkles, Clock, Loader2, Crown, Palette, Frame, Award } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Category = "all" | "frame" | "name_color" | "theme" | "badge";

const categories: { key: Category; label: string; Icon: any }[] = [
  { key: "all", label: "All", Icon: ShoppingBag },
  { key: "frame", label: "Frames", Icon: Frame },
  { key: "name_color", label: "Colors", Icon: Palette },
  { key: "theme", label: "Themes", Icon: Crown },
  { key: "badge", label: "Badges", Icon: Award },
];

const rarityColors: Record<string, string> = {
  common: "text-muted-foreground border-border/50",
  rare: "text-blue-400 border-blue-400/30 bg-blue-400/5",
  epic: "text-purple-400 border-purple-400/30 bg-purple-400/5",
  legendary: "text-amber-400 border-amber-400/30 bg-amber-400/5",
};

function ItemPreview({ item }: { item: ShopItem }) {
  if (item.category === "frame") {
    return (
      <div className={cn("w-14 h-14 rounded-full bg-muted flex items-center justify-center", item.preview_value)}>
        <span className="text-lg">👤</span>
      </div>
    );
  }
  if (item.category === "name_color") {
    return (
      <span className={cn("font-display font-bold text-base", item.preview_value)}>@user</span>
    );
  }
  if (item.category === "theme") {
    return (
      <div className={cn("w-full h-14 rounded-xl", item.preview_value)} />
    );
  }
  if (item.category === "badge") {
    return <span className="text-3xl">{item.preview_value}</span>;
  }
  return null;
}

export default function Shop() {
  const { user, profile } = useAuth();
  const { items, ownedIds, loading, purchase, equip, unequip } = useShop();
  const [category, setCategory] = useState<Category>("all");
  const [purchaseItem, setPurchaseItem] = useState<ShopItem | null>(null);
  const [processing, setProcessing] = useState(false);

  const filteredItems = category === "all" ? items : items.filter((i) => i.category === category);

  // Determine equipped items from profile
  const equippedMap: Record<string, string | null> = {
    frame: (profile as any)?.equipped_frame || null,
    name_color: (profile as any)?.equipped_name_color || null,
    theme: (profile as any)?.equipped_theme || null,
    badge: (profile as any)?.equipped_badge || null,
  };

  const handlePurchase = async () => {
    if (!purchaseItem) return;
    setProcessing(true);
    const result = await purchase(purchaseItem.id);
    if (result.success) {
      toast.success(`Purchased ${result.item} for ${result.price} AURIX! 🎉`);
      clearCosmeticsCache(user?.id);
    } else {
      toast.error(result.error);
    }
    setProcessing(false);
    setPurchaseItem(null);
  };

  const handleEquip = async (item: ShopItem) => {
    setProcessing(true);
    const result = await equip(item.id);
    if (result.success) {
      toast.success(`Equipped ${item.name}!`);
      clearCosmeticsCache(user?.id);
    } else {
      toast.error(result.error);
    }
    setProcessing(false);
  };

  const handleUnequip = async (cat: string) => {
    setProcessing(true);
    const result = await unequip(cat);
    if (result.success) {
      toast.success("Unequipped!");
      clearCosmeticsCache(user?.id);
    } else {
      toast.error(result.error);
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          className="glass-card rounded-2xl p-5 md:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-7 h-7 text-primary" />
                AURIX Shop
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Customize your profile with exclusive cosmetics
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <Coins className="w-4 h-4 text-aura-gold" />
              <span className="font-display font-bold text-primary">
                {profile?.aurix_balance?.toLocaleString() ?? 0}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors tap-scale whitespace-nowrap"
            >
              {category === cat.key && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/30"
                  layoutId="shopCategoryTab"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={cn("relative z-10 flex items-center gap-1.5", category === cat.key ? "text-primary" : "text-muted-foreground")}>
                <cat.Icon className="w-3.5 h-3.5" />
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => {
              const owned = ownedIds.has(item.id);
              const equipped = equippedMap[item.category] === item.id;

              return (
                <motion.div
                  key={item.id}
                  className={cn(
                    "glass-card rounded-2xl p-4 md:p-5 relative overflow-hidden",
                    equipped && "border-primary/40"
                  )}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  {equipped && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30 text-primary">
                        <Check className="w-3 h-3 mr-0.5" /> Equipped
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    {/* Preview */}
                    <div className="w-16 h-16 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
                      <ItemPreview item={item} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-sm text-foreground truncate">{item.name}</h3>
                        <Badge variant="outline" className={cn("text-[10px] capitalize", rarityColors[item.rarity])}>
                          {item.rarity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>

                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-aura-gold" />
                          <span className="text-xs font-bold text-foreground">{item.price}</span>
                        </div>
                        {!item.is_permanent && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px]">{item.duration_days}d</span>
                          </div>
                        )}
                        {item.is_permanent && (
                          <div className="flex items-center gap-1 text-aura-mint">
                            <Sparkles className="w-3 h-3" />
                            <span className="text-[10px]">Permanent</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {!owned ? (
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs gradient-primary text-primary-foreground glow-sm"
                        onClick={() => setPurchaseItem(item)}
                        disabled={processing || (profile?.aurix_balance ?? 0) < item.price}
                      >
                        <Coins className="w-3 h-3 mr-1" />
                        Buy for {item.price}
                      </Button>
                    ) : equipped ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleUnequip(item.category)}
                        disabled={processing}
                      >
                        Unequip
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleEquip(item)}
                        disabled={processing}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Equip
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Purchase confirmation */}
      <AlertDialog open={!!purchaseItem} onOpenChange={() => setPurchaseItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purchase {purchaseItem?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cost <strong>{purchaseItem?.price} AURIX</strong> from your balance.
              {!purchaseItem?.is_permanent && (
                <> This item lasts <strong>{purchaseItem?.duration_days} days</strong>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurchase}
              disabled={processing}
              className="gradient-primary text-primary-foreground"
            >
              {processing ? "Purchasing…" : `Buy for ${purchaseItem?.price} AURIX`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
