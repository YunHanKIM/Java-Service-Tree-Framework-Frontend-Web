import { Clock3, Heart, Send, Trophy, Users } from "lucide-react";
import { STAGES, STAGE_LABELS } from "@/types/domain";
import type { Stage } from "@/types/domain";

const STAGE_ICON: Record<Stage, React.ComponentType<{ className?: string }>> = {
  interested: Heart,
  planned: Clock3,
  applied: Send,
  interview: Users,
  result: Trophy,
};

export function PipelineStrip({ counts }: { counts: Partial<Record<Stage, number>> }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STAGES.map((stage, idx) => {
        const Icon = STAGE_ICON[stage];
        return (
          <div key={stage} className="flex items-center gap-1">
            <div className="flex min-w-16 flex-col items-center gap-1">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </div>
              <span className="text-sm font-semibold">{counts[stage] ?? 0}</span>
              <span className="text-[11px] text-muted-foreground">{STAGE_LABELS[stage]}</span>
            </div>
            {idx < STAGES.length - 1 && <span className="mb-4 text-muted-foreground/50">›</span>}
          </div>
        );
      })}
    </div>
  );
}
