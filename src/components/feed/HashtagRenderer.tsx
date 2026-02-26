import { Fragment } from "react";

interface HashtagRendererProps {
  content: string;
  onHashtagClick?: (hashtag: string) => void;
}

export function HashtagRenderer({ content, onHashtagClick }: HashtagRendererProps) {
  const parts = content.split(/(#\w+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("#") && part.length > 1) {
          const tag = part.slice(1).toLowerCase();
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onHashtagClick?.(tag);
              }}
              className="text-primary font-medium hover:underline tap-scale"
            >
              {part}
            </button>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
