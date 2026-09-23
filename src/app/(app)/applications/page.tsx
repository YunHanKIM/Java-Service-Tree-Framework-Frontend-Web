"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/applications/kanban-column";
import { ApplicationDetailDialog } from "@/components/applications/detail-dialog";
import { ensureSeedData } from "@/lib/client/seed";
import { applicationsStore } from "@/lib/client/store";
import { STAGES, STAGE_LABELS } from "@/types/domain";
import type { ApplicationWithPosting, Stage } from "@/types/domain";

type SortOrder = "recent" | "deadline";

// 서버가 없어 진짜 실패는 없지만, 낙관적 업데이트의 실패-복구 흐름을 보여주기 위해 12% 확률로 실패를 시뮬레이션한다.
function simulateCommit(): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => (Math.random() < 0.12 ? reject(new Error("mock_network_error")) : resolve()), 450);
  });
}

export default function ApplicationsPage() {
  const [entries, setEntries] = useState<ApplicationWithPosting[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("recent");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    ensureSeedData();
    setEntries(applicationsStore.listWithPostings());
  }, []);

  const filtered = useMemo(() => {
    let list = entries.filter((e) => e.posting);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) => (e.posting!.title || "").toLowerCase().includes(q) || (e.posting!.company || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "deadline") {
        const da = a.posting!.deadline ? new Date(a.posting!.deadline).getTime() : Infinity;
        const db = b.posting!.deadline ? new Date(b.posting!.deadline).getTime() : Infinity;
        return da - db;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [entries, query, sort]);

  const grouped = useMemo(() => {
    const map = new Map<Stage, ApplicationWithPosting[]>(STAGES.map((s) => [s, []]));
    filtered.forEach((e) => map.get(e.stage)?.push(e));
    return map;
  }, [filtered]);

  const openEntry = entries.find((e) => e.id === openId) ?? null;

  async function changeStage(id: string, newStage: Stage) {
    const current = entries.find((e) => e.id === id);
    if (!current || current.stage === newStage) return;
    const previousStage = current.stage;

    // 낙관적 업데이트: 커밋을 기다리지 않고 먼저 화면 상태를 바꾼다
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, stage: newStage } : e)));

    try {
      await simulateCommit();
      applicationsStore.updateStage(id, newStage);
      toast.success(`"${current.posting?.title ?? "공고"}" → ${STAGE_LABELS[newStage]}(으)로 이동했어요.`);
    } catch {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, stage: previousStage } : e)));
      toast.error("상태 변경에 실패했어요. 다시 시도해주세요.");
    }
  }

  function saveNote(id: string, note: string) {
    applicationsStore.updateResultNote(id, note);
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, resultNote: note } : e)));
  }

  function removeEntry(id: string) {
    applicationsStore.remove(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast("지원 목록에서 제거했어요.");
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    changeStage(String(active.id), over.id as Stage);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="지원 관리" description="카드를 드래그하거나 메뉴에서 상태를 선택해 지원 단계를 관리하세요." />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-64">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="회사·직무 검색" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOrder)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">최신 등록순</SelectItem>
            <SelectItem value="deadline">마감 임박순</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length}건</span>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              entries={grouped.get(stage) ?? []}
              onOpenCard={setOpenId}
              onChangeStage={changeStage}
            />
          ))}
        </div>
      </DndContext>

      <ApplicationDetailDialog
        entry={openEntry}
        open={Boolean(openId)}
        onOpenChange={(o) => !o && setOpenId(null)}
        onChangeStage={changeStage}
        onSaveNote={saveNote}
        onRemove={removeEntry}
      />
    </div>
  );
}
