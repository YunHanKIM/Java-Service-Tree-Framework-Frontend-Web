"use client";

import Link from "next/link";
import {
  AlertCircle,
  BookmarkPlus,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Gauge,
  ListChecks,
  MapPin,
  MessageSquareText,
  PenLine,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { STAGE_LABELS } from "@/types/domain";
import type { Application, JobPosting } from "@/types/domain";

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return Math.round((t.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function SkillPills({ skills }: { skills: string[] }) {
  if (skills.length === 0) return <span className="text-sm text-muted-foreground">없음</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <Badge key={s} variant="secondary">
          {s}
        </Badge>
      ))}
    </div>
  );
}

export function AnalysisPanel({
  posting,
  application,
  onSaveApplication,
  onTogglePrep,
}: {
  posting: JobPosting;
  application: Application | null;
  onSaveApplication: () => void;
  onTogglePrep: (id: string, done: boolean) => void;
}) {
  const analysis = posting.analysis;
  const days = daysUntil(posting.deadline);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{posting.company || "회사명 미입력"}</p>
              <h2 className="text-xl font-semibold">{posting.title || "직무명 미입력"}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {posting.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {posting.location}
                  </span>
                )}
                {posting.employmentType && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="size-3.5" />
                    {posting.employmentType}
                  </span>
                )}
                {posting.deadline && days !== null && (
                  <Badge variant={days <= 7 ? "destructive" : "secondary"}>
                    <CalendarDays className="size-3" /> D-{days}
                  </Badge>
                )}
              </div>
            </div>
            {posting.originalUrl && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={posting.originalUrl} target="_blank" rel="noopener noreferrer" />}
              >
                <ExternalLink /> 원문 보기
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">필수 기술</p>
              <SkillPills skills={posting.requiredSkills} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">우대 기술</p>
              <SkillPills skills={posting.preferredSkills} />
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            {application ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <BookmarkPlus className="size-3" /> 지원 현황: {STAGE_LABELS[application.stage]}
                </Badge>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/applications" />}>
                  칸반에서 관리
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={onSaveApplication}>
                <BookmarkPlus /> 지원 목록에 저장
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <>
          {analysis.fitScore !== undefined && (
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold tabular-nums text-primary">{analysis.fitScore}</p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Gauge className="size-4" /> 공고 적합도
                  </p>
                  <Progress value={analysis.fitScore} aria-label="공고 적합도" />
                  <p className="text-xs text-muted-foreground">
                    필수 요건 충족도를 중심으로 AI가 매긴 참고 점수예요. 아래 근거와 함께 판단하세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <CheckCircle2 className="size-4 text-emerald-600" /> 일치하는 경험{" "}
                  <span className="font-normal text-muted-foreground">({analysis.matchingSkills.length}개)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.matchingSkills.length === 0 && (
                  <p className="text-sm text-muted-foreground">일치하는 경험을 찾지 못했어요.</p>
                )}
                {analysis.matchingSkills.map((s) => (
                  <div key={s.name} className="border-b pb-2 last:border-0 last:pb-0">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{s.name}</Badge>
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      <p>
                        <span className="text-foreground/60">공고:</span> {s.postingEvidence}
                      </p>
                      <p>
                        <span className="text-foreground/60">내 이력서:</span> {s.resumeEvidence}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <AlertCircle className="size-4 text-amber-600" /> 보완할 경험{" "}
                  <span className="font-normal text-muted-foreground">({analysis.missingSkills.length}개)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.missingSkills.length === 0 && (
                  <p className="text-sm text-muted-foreground">보완할 경험이 없어요. 훌륭해요!</p>
                )}
                {analysis.missingSkills.map((s) => (
                  <div key={s.name} className="border-b pb-2 last:border-0 last:pb-0">
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{s.name}</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                <ListChecks className="size-4" /> 추천 준비 항목
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.prepItems.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={item.done} onCheckedChange={(v) => onTogglePrep(item.id, Boolean(v))} />
                  <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                </label>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                nativeButton={false}
                render={<Link href={application ? `/interview?applicationId=${application.id}` : "/interview"} />}
              >
                <MessageSquareText /> 예상 면접 질문 준비하기
              </Button>
            </CardContent>
          </Card>

          {analysis.coverLetterReview ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <PenLine className="size-4" /> 자기소개서 피드백
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{analysis.coverLetterReview.alignment}</p>
                {analysis.coverLetterReview.suggestions.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">이 공고에 맞춘 수정 제안</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {analysis.coverLetterReview.suggestions.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground">
              설정에서 자기소개서를 등록하면 이 공고에 맞춘 자기소개서 피드백도 받을 수 있어요.{" "}
              <Link href="/settings" className="underline hover:text-foreground">
                설정으로 이동
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
