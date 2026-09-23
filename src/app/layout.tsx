import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/client/session-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "지원노트",
  description: "AI 채용공고 분석 · 이력서 비교 · 지원 관리를 한 곳에서",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <SessionProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-center" />
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
