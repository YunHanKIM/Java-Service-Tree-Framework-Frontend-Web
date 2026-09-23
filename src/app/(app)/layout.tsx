"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-context";
import { AppShell } from "@/components/layout/app-shell";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          불러오는 중...
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
