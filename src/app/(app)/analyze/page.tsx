"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, FileText, Lightbulb, Link2, Search, Settings, Sparkles, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PipelineStrip } from "@/components/shared/pipeline-strip";
import { ExtractionForm } from "@/components/analyze/extraction-form";
import { AnalysisPanel } from "@/components/analyze/analysis-panel";
import { ensureSeedData } from "@/lib/client/seed";
import { applicationsStore, postingsStore, resumeStore } from "@/lib/client/store";
import { api, ApiError } from "@/lib/client/api";
import type { Application, ExtractedPosting, JobPosting, PostingSource, ResumeProfile, Stage } from "@/types/domain";

type Tab = "paste" | "link" | "pdf";
type Phase = "idle" | "loading" | "form" | "result";

function LoadingCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <p className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="size-4" /> {message}
        </p>
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </CardContent>
    </Card>
  );
}

function AnalyzePageContent() {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pendingOriginalUrl, setPendingOriginalUrl] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedPosting | null>(null);

  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [resume, setResume] = useState<ResumeProfile>({ summary: "", skills: [], experienceSummary: "" });
  const [counts, setCounts] = useState<Partial<Record<Stage, number>>>({});

  useEffect(() => {
    ensureSeedData();
    setResume(resumeStore.get());
    setCounts(applicationsStore.counts());

    const id = searchParams.get("postingId");
    if (id) {
      const p = postingsStore.get(id);
      if (p) {
        setPosting(p);
        setPhase("result");
        setApplication(applicationsStore.getByPosting(p.id));
        if (!p.analysis) runComparison(p, resumeStore.get());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runComparison(target: JobPosting, resumeProfile: ResumeProfile) {
    setComparing(true);
    setCompareError(null);
    setApiKeyMissing(false);
    try {
      const result = await api.compareResume(target, resumeProfile);
      const updated = postingsStore.saveAnalysis(target.id, result);
      if (updated) setPosting(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "분석에 실패했어요.";
      if (err instanceof ApiError && err.code === "NO_API_KEY") setApiKeyMissing(true);
      setCompareError(message);
    } finally {
      setComparing(false);
    }
  }

  async function handleAnalyzeClick() {
    setNotice(null);
    setApiKeyMissing(false);

    if (activeTab === "link") {
      if (!linkUrl.trim()) {
        setNotice("채용공고 URL을 입력해주세요.");
        return;
      }
      setPhase("loading");
      setLoadingMessage("링크를 불러오고 있어요...");
      try {
        const { text, originalUrl } = await api.importUrl(linkUrl.trim());
        setLoadingMessage("공고 내용을 분석하고 있어요...");
        const ex = await api.extractPosting("link", text);
        setPendingOriginalUrl(originalUrl);
        setExtracted(ex);
        setPhase("form");
      } catch (err) {
        setPhase("idle");
        if (err instanceof ApiError && err.code === "NO_API_KEY") {
          setApiKeyMissing(true);
          return;
        }
        const message = err instanceof Error ? err.message : "링크를 가져오지 못했어요.";
        setNotice(message);
        setActiveTab("paste");
      }
      return;
    }

    if (activeTab === "pdf") {
      if (!pdfFile) {
        setNotice("분석할 PDF 파일을 선택해주세요.");
        return;
      }
      setPhase("loading");
      setLoadingMessage("PDF에서 텍스트를 추출하고 있어요...");
      try {
        const { text } = await api.parsePdf(pdfFile);
        setLoadingMessage("공고 내용을 분석하고 있어요...");
        const ex = await api.extractPosting("pdf", text);
        setPendingOriginalUrl(null);
        setExtracted(ex);
        setPhase("form");
      } catch (err) {
        setPhase("idle");
        if (err instanceof ApiError && err.code === "NO_API_KEY") {
          setApiKeyMissing(true);
          return;
        }
        setNotice(err instanceof Error ? err.message : "PDF 처리에 실패했어요.");
      }
      return;
    }

    // paste
    if (!pasteText.trim()) {
      setNotice("공고 본문을 붙여넣어주세요.");
      return;
    }
    setPhase("loading");
    setLoadingMessage("공고 내용을 분석하고 있어요...");
    try {
      const ex = await api.extractPosting("paste", pasteText.trim());
      setPendingOriginalUrl(null);
      setExtracted(ex);
      setPhase("form");
    } catch (err) {
      setPhase("idle");
      if (err instanceof ApiError && err.code === "NO_API_KEY") {
        setApiKeyMissing(true);
        return;
      }
      setNotice(err instanceof Error ? err.message : "분석에 실패했어요.");
    }
  }

  function handleExtractionSubmit(data: ExtractedPosting) {
    const created = postingsStore.create({
      source: activeTab as PostingSource,
      ...data,
      originalUrl: pendingOriginalUrl,
    });
    setPosting(created);
    setApplication(null);
    setPhase("result");
    runComparison(created, resume);
  }

  function handleSaveApplication() {
    if (!posting) return;
    const app = applicationsStore.create({ postingId: posting.id });
    setApplication(app);
    setCounts(applicationsStore.counts());
    toast.success("지원 목록에 저장했어요.");
  }

  function handleTogglePrep(id: string, done: boolean) {
    if (!posting?.analysis) return;
    const nextAnalysis = {
      ...posting.analysis,
      prepItems: posting.analysis.prepItems.map((p) => (p.id === id ? { ...p, done } : p)),
    };
    const updated = postingsStore.saveAnalysis(posting.id, nextAnalysis);
    if (updated) setPosting(updated);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="채용공고 분석" description="AI가 공고와 이력서를 분석해 나에게 맞는 포인트를 찾아드려요." />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Card>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
                <TabsList className="w-full">
                  <TabsTrigger value="paste">
                    <FileText /> 내용 붙여넣기
                  </TabsTrigger>
                  <TabsTrigger value="link">
                    <Link2 /> 링크 입력
                  </TabsTrigger>
                  <TabsTrigger value="pdf">
                    <Upload /> PDF 업로드
                  </TabsTrigger>
                </TabsList>

                {notice && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{notice}</AlertDescription>
                  </Alert>
                )}

                {apiKeyMissing && (
                  <Alert className="mt-3">
                    <Sparkles className="size-4" />
                    <AlertTitle>AI API 키가 필요해요</AlertTitle>
                    <AlertDescription>
                      설정에서 OpenAI 또는 Anthropic API 키를 등록하면 실제 AI 분석을 사용할 수 있어요.
                      <Button variant="link" className="h-auto px-0" nativeButton={false} render={<Link href="/settings" />}>
                        <Settings className="size-3.5" /> 설정으로 이동
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <TabsContent value="paste" className="mt-3 space-y-3">
                  <Textarea
                    rows={7}
                    placeholder="채용공고 페이지의 내용을 그대로 복사해서 붙여넣어 주세요."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                </TabsContent>
                <TabsContent value="link" className="mt-3 space-y-3">
                  <Input
                    type="url"
                    placeholder="https://example.com/jobs/123"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    서버가 실제로 페이지를 가져와서 분석해요. 로그인이 필요하거나 JavaScript로 렌더링되는
                    사이트는 실패할 수 있어요 — 그럴 땐 본문을 복사해서 붙여넣기로 전환해주세요.
                  </p>
                </TabsContent>
                <TabsContent value="pdf" className="mt-3 space-y-3">
                  <Input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
                  {pdfFile && (
                    <p className="text-xs text-muted-foreground">
                      {pdfFile.name} ({(pdfFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">PDF 파일은 최대 10MB까지 업로드할 수 있어요.</p>
                </TabsContent>

                <Button className="mt-4 w-full" onClick={handleAnalyzeClick} disabled={phase === "loading"}>
                  <Sparkles /> 공고 분석하기
                </Button>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">지원 현황 파이프라인</p>
              <Link href="/applications" className="text-sm text-primary hover:underline">
                전체 보기
              </Link>
            </CardContent>
            <CardContent className="pt-0">
              <PipelineStrip counts={counts} />
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Lightbulb className="size-4" /> 분석 더 잘 받는 팁
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>설정에서 이력서 스킬·경험 요약을 최신 상태로 유지해보세요.</li>
                <li>공고 본문은 자격요건·우대사항까지 통째로 붙여넣으면 더 정확해요.</li>
                <li>여러 공고를 분석해서 나에게 맞는 곳을 비교해보세요.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          {phase === "loading" && <LoadingCard message={loadingMessage} />}

          {phase === "form" && extracted && <ExtractionForm extracted={extracted} onSubmit={handleExtractionSubmit} />}

          {phase === "result" && posting && (
            <div className="space-y-4">
              <AnalysisPanel
                posting={posting}
                application={application}
                onSaveApplication={handleSaveApplication}
                onTogglePrep={handleTogglePrep}
              />
              {comparing && <LoadingCard message="이력서와 비교해 적합도를 분석하고 있어요..." />}
              {compareError && !comparing && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription className="flex items-center justify-between gap-2">
                    <span>{compareError}</span>
                    <Button size="sm" variant="outline" onClick={() => runComparison(posting, resume)}>
                      다시 시도
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {phase === "idle" && (
            <Card>
              <CardContent>
                <EmptyState icon={Search} message="왼쪽에서 공고를 입력하고 분석을 시작해보세요." />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <AnalyzePageContent />
    </Suspense>
  );
}
