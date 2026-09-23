"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./kanban-card";
import { STAGE_LABELS } from "@/types/domain";
import type { ApplicationWithPosting, Stage } from "@/types/domain";

export function KanbanColumn({
  stage,
  entries,
  onOpenCard,
  onChangeStage,
}: {
  stage: Stage;
  entries: ApplicationWithPosting[];
  onOpenCard: (id: string) => void;
  onChangeStage: (id: string, stage: Stage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[272px] shrink-0 flex-col rounded-xl border bg-muted/40 p-2.5 transition-colors ${
        isOver ? "border-primary/50 bg-primary/5" : "border-transparent"
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
        <span className="flex size-5 items-center justify-center rounded-full border bg-background text-[11px]">
          {entries.length}
        </span>
      </div>
      <div className="flex min-h-24 flex-col gap-2">
        {entries.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">카드 없음</div>
        ) : (
          entries.map((entry) => (
            <KanbanCard
              key={entry.id}
              entry={entry}
              onOpen={() => onOpenCard(entry.id)}
              onChangeStage={(next) => onChangeStage(entry.id, next)}
            />
          ))
        )}
      </div>
    </div>
  );
}
