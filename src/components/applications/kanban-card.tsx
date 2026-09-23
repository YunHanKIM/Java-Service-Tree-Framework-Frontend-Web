"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STAGES, STAGE_LABELS } from "@/types/domain";
import type { ApplicationWithPosting, Stage } from "@/types/domain";
import { roParticle } from "@/lib/client/korean";

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return Math.round((t.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

export function KanbanCard({
  entry,
  onOpen,
  onChangeStage,
}: {
  entry: ApplicationWithPosting;
  onOpen: () => void;
  onChangeStage: (stage: Stage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: entry.id });
  const posting = entry.posting;
  if (!posting) return null;

  const days = daysUntil(posting.deadline);
  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 20 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold">{posting.title || "(제목 없음)"}</p>
          <p className="truncate text-xs text-muted-foreground">{posting.company}</p>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label="드래그해서 단계 이동"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="3" cy="2" r="1.1" /><circle cx="9" cy="2" r="1.1" />
              <circle cx="3" cy="6" r="1.1" /><circle cx="9" cy="6" r="1.1" />
              <circle cx="3" cy="10" r="1.1" /><circle cx="9" cy="10" r="1.1" />
            </svg>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STAGES.map((stage) => (
                <DropdownMenuItem key={stage} disabled={stage === entry.stage} onClick={() => onChangeStage(stage)}>
                  {STAGE_LABELS[stage]}{roParticle(STAGE_LABELS[stage])} 이동
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {posting.requiredSkills.slice(0, 2).map((s) => (
          <Badge key={s} variant="secondary" className="text-[11px]">
            {s}
          </Badge>
        ))}
        {posting.deadline && days !== null && (
          <Badge variant={days <= 7 ? "destructive" : "outline"} className="text-[11px]">
            D-{days}
          </Badge>
        )}
      </div>
    </div>
  );
}
