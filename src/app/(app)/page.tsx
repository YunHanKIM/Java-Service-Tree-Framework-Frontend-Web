"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Inbox, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { ensureSeedData } from "@/lib/client/seed";
import { applicationsStore, postingsStore } from "@/lib/client/store";
import { STAGE_LABELS } from "@/types/domain";
import type { Application, JobPosting, Stage } from "@/types/domain";

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const diff = new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
}

function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

export default function DashboardPage() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [counts, setCounts] = useState<Partial<Record<Stage, number>>>({});

  useEffect(() => {
    ensureSeedData();
    setPostings(postingsStore.list());
    setApplications(applicationsStore.list());
    setCounts(applicationsStore.counts());
  }, []);

  const stats = useMemo(() => {
    const deadlineSoon = postings.filter((p) => {
      const d = daysUntil(p.deadline);
      return d !== null && d >= 0 && d <= 7;
    }).length;
    return {
      total: postings.length,
      inProgress: applications.filter((a) => a.stage !== "result").length,
      deadlineSoon,
      advanced: (counts.interview ?? 0) + (counts.result ?? 0),
    };
  }, [postings, applications, counts]);

  const deadlineList = useMemo(
    () =>
      postings
        .filter((p) => p.deadline)
        .map((p) => ({ posting: p, days: daysUntil(p.deadline) as number }))
        .filter((x) => x.days >= 0)
        .sort((a, b) => a.days - b.days)
        .slice(0, 5),
    [postings]
  );

  const recentPostings = postings.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="대시보드"
        description="오늘의 노력이 더 나은 기회를 만듭니다."
        action={
          <Button render={<Link href="/analyze" />}>
            <Plus /> 새 공고 분석
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="전체 등록 공고" value={stats.total} />
        <StatTile label="진행 중인 지원" value={stats.inProgress} />
        <StatTile label="마감 7일 이내" value={stats.deadlineSoon} />
        <StatTile label="면접·결과 단계" value={stats.advanced} />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>지원 파이프라인</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineChart counts={counts} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>마감 임박 공고</CardTitle>
            <Link href="/applications" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          </CardHeader>
          <CardContent>
            {deadlineList.length === 0 ? (
              <EmptyState icon={CalendarClock} message="마감이 임박한 공고가 없어요." />
            ) : (
              <ul className="divide-y">
                {deadlineList.map(({ posting, days }) => (
                  <li key={posting.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{posting.title || "(제목 미입력)"}</p>
                      <p className="truncate text-xs text-muted-foreground">{posting.company || "회사명 미입력"}</p>
                    </div>
                    <Badge variant={days <= 3 ? "destructive" : "secondary"}>D-{days}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>최근 등록한 공고</CardTitle>
          <Link href="/analyze" className="text-sm text-primary hover:underline">
            공고 분석하러 가기
          </Link>
        </CardHeader>
        <CardContent>
          {recentPostings.length === 0 ? (
            <EmptyState
              icon={Inbox}
              message="아직 등록한 공고가 없어요."
              action={
                <Button render={<Link href="/analyze" />} size="sm">
                  첫 공고 분석하기
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {recentPostings.map((posting) => {
                const app = applications.find((a) => a.postingId === posting.id);
                return (
                  <li key={posting.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {posting.title || "(제목 미입력)"} · {posting.company}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{formatRelative(posting.createdAt)}</p>
                    </div>
                    <Badge variant="secondary">{app ? STAGE_LABELS[app.stage] : "미등록"}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
