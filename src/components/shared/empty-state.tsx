import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  message,
  action,
}: {
  icon?: LucideIcon;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Icon className="size-8 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
