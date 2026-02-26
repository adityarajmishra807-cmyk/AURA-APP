import { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

interface MediaItem {
  media_url: string;
  media_type: string;
  position: number;
}

interface MediaCarouselProps {
  items: MediaItem[];
}

export function MediaCarousel({ items }: MediaCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = () => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  };

  return (
    <div className="mb-3 md:mb-4">
      <Carousel
        setApi={(a) => {
          setApi(a);
          a?.on("select", onSelect);
        }}
        className="rounded-xl overflow-hidden border border-border/30"
      >
        <CarouselContent>
          {items
            .sort((a, b) => a.position - b.position)
            .map((item, i) => (
              <CarouselItem key={i}>
                {item.media_type === "video" ? (
                  <video
                    src={item.media_url}
                    controls
                    className="w-full max-h-72 md:max-h-96 object-cover"
                  />
                ) : item.media_type === "audio" ? (
                  <div className="p-4">
                    <audio src={item.media_url} controls className="w-full" />
                  </div>
                ) : (
                  <img
                    src={item.media_url}
                    alt={`Media ${i + 1}`}
                    className="w-full max-h-72 md:max-h-96 object-cover"
                    loading="lazy"
                  />
                )}
              </CarouselItem>
            ))}
        </CarouselContent>
        {items.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>
      {/* Dots */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {items.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                i === current ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
