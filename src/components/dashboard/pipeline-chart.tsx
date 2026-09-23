"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { STAGES, STAGE_LABELS } from "@/types/domain";
import type { Stage } from "@/types/domain";

// 순서형(ordinal) 단일 계열 비교 — dataviz 스킬 palette.md의 sequential blue 램프(step 250~650)를
// 단계가 진행될수록 어두워지도록 적용. 단일 계열이라 범례 없이 값(LabelList)을 직접 라벨링한다.
const STAGE_COLOR: Record<Stage, string> = {
  interested: "#86b6ef",
  planned: "#5598e7",
  applied: "#2a78d6",
  interview: "#1c5cab",
  result: "#104281",
};

const chartConfig = {
  count: { label: "지원 수" },
} satisfies ChartConfig;

export function PipelineChart({ counts }: { counts: Partial<Record<Stage, number>> }) {
  const data = STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: counts[stage] ?? 0,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 28 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={64} fontSize={13} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" radius={4} barSize={20}>
          {data.map((entry) => (
            <Cell key={entry.stage} fill={STAGE_COLOR[entry.stage]} />
          ))}
          <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} fontWeight={700} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
