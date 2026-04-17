import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "./button";

export function BackToBottom() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 h-10 w-10 rounded-full shadow-lg opacity-90 hover:opacity-100 transition-opacity"
      onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
      aria-label="Back to bottom"
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  );
}
