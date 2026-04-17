import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BackToTop } from "@/components/ui/BackToTop";
import { BackToBottom } from "@/components/ui/BackToBottom";
import { SupportChat } from "@/components/SupportChat";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
      <BackToTop />
      <BackToBottom />
      <SupportChat />
    </div>
  );
}
