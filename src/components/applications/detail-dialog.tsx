"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, MessageSquareText, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGES, STAGE_LABELS } from "@/types/domain";
import type { ApplicationWithPosting, Stage } from "@/types/domain";

export function ApplicationDetailDialog({
  entry,
  open,
  onOpenChange,
  onChangeStage,
  onSaveNote,
  onRemove,
}: {
  entry: ApplicationWithPosting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeStage: (id: string, stage: Stage) => void;
  onSaveNote: (id: string, note: string) => void;
  onRemove: (id: string) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote(entry?.resultNote ?? "");
  }, [entry]);

  if (!entry?.posting) return null;
  const posting = entry.posting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-sm text-muted-foreground">{posting.company}</p>
          <DialogTitle>{posting.title || "(제목 없음)"}</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-3 pt-1">
            {posting.location && <span>{posting.location}</span>}
            {posting.employmentType && <span>{posting.employmentType}</span>}
            {posting.deadline && <span>{new Date(posting.deadline).toLocaleDateString("ko-KR")}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {[...posting.requiredSkills, ...posting.preferredSkills].map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">지원 단계</Label>
          <Select value={entry.stage} onValueChange={(v) => onChangeStage(entry.id, v as Stage)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: Stage) => STAGE_LABELS[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">메모</Label>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onSaveNote(entry.id, note)}
            placeholder="예: 1차 서류 합격, 최종 결과 대기 중"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/analyze?postingId=${posting.id}`} />}>
            <FileText /> 공고 분석 다시 보기
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/interview?applicationId=${entry.id}`} />}>
            <MessageSquareText /> 면접 준비
          </Button>
          {posting.originalUrl && (
            <Button variant="outline" size="sm" nativeButton={false} render={<a href={posting.originalUrl} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink /> 원문
            </Button>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              onRemove(entry.id);
              onOpenChange(false);
            }}
          >
            <Trash2 /> 지원 목록에서 제거
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
