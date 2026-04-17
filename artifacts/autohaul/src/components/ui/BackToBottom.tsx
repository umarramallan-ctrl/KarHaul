import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "./button";

function isAtBottom() {
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
}

export function BackToBottom() {
  const [visible, setVisible] = useState(false);
  const [faded, setFaded] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const shouldShow = window.scrollY > 300 && !isAtBottom();
      setVisible(shouldShow);
      setFaded(false);

      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      if (shouldShow) {
        fadeTimer.current = setTimeout(() => setFaded(true), 3000);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 h-10 w-10 rounded-full shadow-lg transition-opacity duration-500 hover:opacity-100 ${faded ? "opacity-0 pointer-events-none" : "opacity-90"}`}
      onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
      aria-label="Back to bottom"
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  );
}
