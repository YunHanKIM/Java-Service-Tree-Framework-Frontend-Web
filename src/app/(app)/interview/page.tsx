"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, Settings, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/shared/empty-state";
import { QuestionCard } from "@/components/interview/question-card";
import { ensureSeedData } from "@/lib/client/seed";
import { applicationsStore, interviewStore } from "@/lib/client/store";
import { api, ApiError } from "@/lib/client/api";
import { STAGE_LABELS } from "@/types/domain";
import type { ApplicationWithPosting, InterviewQA } from "@/types/domain";

function InterviewPageContent() {
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<ApplicationWithPosting[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [questions, setQuestions] = useState<InterviewQA[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    ensureSeedData();
    const apps = applicationsStore.listWithPostings().filter((a) => a.posting);
    apps.sort((a, b) => {
      if (a.stage === "interview" && b.stage !== "interview") return -1;
      if (b.stage === "interview" && a.stage !== "interview") return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    setApplications(apps);

    const preferred = searchParams.get("applicationId");
    const initial = preferred && apps.some((a) => a.id === preferred) ? preferred : (apps[0]?.id ?? "");
    setSelectedId(initial);
    if (initial) setQuestions(interviewStore.listByApplication(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  function handleSelect(id: string | null) {
    if (!id) return;
    setSelectedId(id);
    setQuestions(interviewStore.listByApplication(id));
    setError(null);
  }

  async function handleGenerate() {
    if (!selected?.posting) return;
    setLoadingQuestions(true);
    setError(null);
    setApiKeyMissing(false);
    try {
      const { questions: generated } = await api.generateQuestions(selected.posting);
      const created = interviewStore.bulkCreate(selected.id, generated);
      setQuestions((prev) => [...created, ...prev]);
    } catch (err) {
      if (err instanceof ApiError && err.code === "NO_API_KEY") setApiKeyMissing(true);
      setError(err instanceof Error ? err.message : "질문 생성에 실패했어요.");
    } finally {
      setLoadingQuestions(false);
    }
  }

  function handleSaveAnswer(id: string, answer: string) {
    interviewStore.updateAnswer(id, answer);
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, answer } : q)));
  }

  async function handleRequestFeedback(id: string, question: string, answer: string) {
    try {
      const { feedback } = await api.generateFeedback(question, answer);
      interviewStore.setFeedback(id, feedback);
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, feedback } : q)));
    } catch (err) {
      if (err instanceof ApiError && err.code === "NO_API_KEY") {
        setApiKeyMissing(true);
        toast.error("AI API 키가 필요해요. 설정에서 등록해주세요.");
        return;
      }
      toast.error(err instanceof Error ? err.message : "피드백 생성에 실패했어요.");
    }
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="면접 준비" description="예상 질문에 답변을 작성하고 AI 피드백을 받아보세요." />
        <Card>
          <CardContent>
            <EmptyState
              message="아직 지원 목록에 저장된 공고가 없어요."
              action={
                <Button size="sm" render={<Link href="/analyze" />}>
                  공고 분석하러 가기
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="면접 준비" description="예상 질문에 답변을 작성하고 AI 피드백을 받아보세요." />

      <Card>
        <CardContent>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">준비할 지원 항목</label>
          <Select value={selectedId} onValueChange={handleSelect}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {applications.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.posting!.company} · {a.posting!.title} ({STAGE_LABELS[a.stage]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {apiKeyMissing && (
        <Alert>
          <Sparkles className="size-4" />
          <AlertTitle>AI API 키가 필요해요</AlertTitle>
          <AlertDescription>
            설정에서 OpenAI 또는 Anthropic API 키를 등록하면 실제 AI가 질문·피드백을 생성해요.
            <Button variant="link" className="h-auto px-0" render={<Link href="/settings" />}>
              <Settings className="size-3.5" /> 설정으로 이동
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {selected?.posting && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">{selected.posting.company}</p>
              <p className="font-semibold">{selected.posting.title}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loadingQuestions}>
              <RefreshCw className={loadingQuestions ? "animate-spin" : ""} />
              {questions.length > 0 ? "질문 다시 만들기" : "예상 질문 만들기"}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && !apiKeyMissing && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loadingQuestions ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="아직 만든 질문이 없어요. 위 버튼으로 예상 면접 질문을 생성해보세요." />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((qa) => (
            <QuestionCard
              key={qa.id}
              qa={qa}
              onSaveAnswer={(answer) => handleSaveAnswer(qa.id, answer)}
              onRequestFeedback={(answer) => handleRequestFeedback(qa.id, qa.question, answer)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <InterviewPageContent />
    </Suspense>
  );
}
