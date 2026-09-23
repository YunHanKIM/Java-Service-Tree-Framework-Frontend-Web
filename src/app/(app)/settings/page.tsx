"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload } from "lucide-react";
import { resumeStore } from "@/lib/client/store";
import { api } from "@/lib/client/api";
import { EMPTY_RESUME } from "@/types/domain";
import type { AiProviderName, AiSettings, ResumeProfile } from "@/types/domain";

const PROVIDER_LABEL: Record<AiProviderName, string> = {
  openai: "OpenAI (ChatGPT)",
  anthropic: "Anthropic (Claude)",
  local: "로컬 LLM (Ollama)",
};

const PROVIDER_KEY_HELP: Record<Exclude<AiProviderName, "local">, { url: string; label: string }> = {
  openai: { url: "https://platform.openai.com/api-keys", label: "platform.openai.com에서 발급" },
  anthropic: { url: "https://console.anthropic.com/settings/keys", label: "console.anthropic.com에서 발급" },
};

const DOC_MAX_CHARS = 20000;

/** 이력서·자기소개서 원문 입력 — 파일(PDF는 서버에서 텍스트 추출, 스캔본은 OCR)을 올리면 내용을 채우고, 직접 수정도 가능 */
function DocumentField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const { text, notice } = await api.parsePdf(file);
        if (notice) toast.info(notice);
        onChange(text);
      } else {
        onChange((await file.text()).slice(0, DOC_MAX_CHARS));
      }
      toast.success(`${file.name}에서 내용을 불러왔어요. 확인 후 저장해주세요.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "파일을 읽지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label} <span className="font-normal text-muted-foreground">({value.length.toLocaleString()}자)</span>
        </Label>
        <Button type="button" variant="outline" size="sm" disabled={loading} nativeButton={false} render={<label />}>
          <Upload /> {loading ? "불러오는 중..." : "파일 불러오기"}
          <input
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain"
            className="sr-only"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
        </Button>
      </div>
      <Textarea
        id={id}
        rows={6}
        maxLength={DOC_MAX_CHARS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="여기에 붙여넣거나 파일을 불러오세요."
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function SettingsPage() {
  const [resume, setResume] = useState<ResumeProfile>(EMPTY_RESUME);
  const [skillsInput, setSkillsInput] = useState("");
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [provider, setProvider] = useState<AiProviderName>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [shareAsDemoPool, setShareAsDemoPool] = useState(false);
  const [localModel, setLocalModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [visionModel, setVisionModel] = useState("");
  const [localModels, setLocalModels] = useState<string[] | null>(null);
  const [checkingLocal, setCheckingLocal] = useState(false);
  const [savingResume, setSavingResume] = useState(false);
  const [savingAi, setSavingAi] = useState(false);

  useEffect(() => {
    const r = resumeStore.get();
    setResume(r);
    setSkillsInput(r.skills.join(", "));

    fetch("/api/settings/ai").then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as AiSettings;
      setAiSettings(data);
      setProvider(data.provider);
      setShareAsDemoPool(data.shareAsDemoPool);
      setBaseUrl(data.baseUrl);
      setVisionModel(data.visionModel);
      if (data.provider === "local") setLocalModel(data.model);
    });
  }, []);

  function handleSaveResume(e: React.FormEvent) {
    e.preventDefault();
    setSavingResume(true);
    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = resumeStore.update({ ...resume, skills });
    setResume(next);
    setSavingResume(false);
    toast.success("이력서 정보를 저장했어요.");
  }

  async function handleSaveAi(e: React.FormEvent) {
    e.preventDefault();
    setSavingAi(true);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          provider === "local"
            ? { provider, model: localModel || undefined, baseUrl, visionModel }
            : { provider, apiKey: apiKey || undefined, shareAsDemoPool }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "저장에 실패했어요.");
        return;
      }
      setAiSettings(data);
      setApiKey("");
      toast.success("AI 설정을 저장했어요.");
    } finally {
      setSavingAi(false);
    }
  }

  // 저장된 주소 기준으로 확인한다 — 방금 입력한 주소를 확인하려면 먼저 저장해야 한다
  async function handleCheckLocal() {
    setCheckingLocal(true);
    setLocalModels(null);
    try {
      const res = await fetch("/api/settings/ai/local-models");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ollama 연결에 실패했어요.");
        return;
      }
      setLocalModels(data.models);
      toast.success(`Ollama 연결 성공 — 모델 ${data.models.length}개`);
    } finally {
      setCheckingLocal(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="설정" description="이력서 정보와 AI 연동을 관리하세요." />

      <Card>
        <CardHeader>
          <CardTitle>이력서 프로필</CardTitle>
          <CardDescription>공고 분석 시 이 정보를 기준으로 AI가 적합도를 비교합니다.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveResume}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="summary">한 줄 소개</Label>
              <Input
                id="summary"
                value={resume.summary}
                onChange={(e) => setResume((r) => ({ ...r, summary: e.target.value }))}
                placeholder="예: 프론트엔드 개발자 지망, React 기반 프로젝트 3건 경험"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skills">
                보유 기술 <span className="font-normal text-muted-foreground">(쉼표로 구분)</span>
              </Label>
              <Input id="skills" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="React, TypeScript, JavaScript, Git" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experience">경력 요약</Label>
              <Textarea
                id="experience"
                rows={4}
                value={resume.experienceSummary}
                onChange={(e) => setResume((r) => ({ ...r, experienceSummary: e.target.value }))}
                placeholder="프로젝트 경험, 담당 역할, 주요 성과를 자유롭게 작성하세요."
              />
            </div>
            <DocumentField
              id="resumeText"
              label="이력서 원문"
              hint="PDF·TXT 파일을 올리거나 직접 붙여넣으세요. 비교 분석 시 요약보다 우선하는 근거로 쓰여요."
              value={resume.resumeText}
              onChange={(resumeText) => setResume((r) => ({ ...r, resumeText }))}
            />
            <DocumentField
              id="coverLetterText"
              label="자기소개서"
              hint="등록하면 공고마다 자기소개서가 요구 역량을 잘 어필하는지 피드백과 수정 제안을 받을 수 있어요."
              value={resume.coverLetterText}
              onChange={(coverLetterText) => setResume((r) => ({ ...r, coverLetterText }))}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={savingResume}>
              저장
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 연동</CardTitle>
          <CardDescription>
            OpenAI 또는 Anthropic API 키를 등록하면 실제 AI가 공고 분석·이력서 비교·면접 질문을 생성합니다. 키는
            서버에만 저장되고 브라우저로 다시 전송되지 않습니다. 기본적으로 <strong>이 계정에만</strong>
            연결되는 키입니다 — 다른 계정(데모 계정 포함)의 AI 호출에는 쓰이지 않습니다.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveAi}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>AI 프로바이더</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as AiProviderName)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: AiProviderName) => PROVIDER_LABEL[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">{PROVIDER_LABEL.anthropic}</SelectItem>
                  <SelectItem value="openai">{PROVIDER_LABEL.openai}</SelectItem>
                  <SelectItem value="local">{PROVIDER_LABEL.local}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {provider === "local" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="baseUrl">Ollama 주소</Label>
                  <Input
                    id="baseUrl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                  />
                  <p className="text-xs text-muted-foreground">
                    보안상 localhost/127.0.0.1 주소만 허용돼요. 앱 서버와 같은 PC에서 <code>ollama serve</code>가
                    실행 중이어야 합니다.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="localModel">분석 모델</Label>
                  <Input
                    id="localModel"
                    value={localModel}
                    onChange={(e) => setLocalModel(e.target.value)}
                    placeholder="qwen2.5:7b"
                  />
                  <p className="text-xs text-muted-foreground">
                    한국어 공고라면 qwen2.5·gemma3 계열을 추천해요. 먼저 <code>ollama pull qwen2.5:7b</code>로 받아두세요.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="visionModel">
                    비전 모델 <span className="font-normal text-muted-foreground">(선택)</span>
                  </Label>
                  <Input
                    id="visionModel"
                    value={visionModel}
                    onChange={(e) => setVisionModel(e.target.value)}
                    placeholder="qwen2.5vl:7b"
                  />
                  <p className="text-xs text-muted-foreground">
                    공고 이미지·스캔 PDF를 읽을 때 사용해요. 비워두면 내장 OCR(tesseract)로 글자를 인식합니다.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCheckLocal} disabled={checkingLocal}>
                    연결 확인
                  </Button>
                  {localModels && (
                    <span className="text-xs text-muted-foreground">
                      설치된 모델: {localModels.length > 0 ? localModels.join(", ") : "없음"}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="apiKey">API 키</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={aiSettings?.hasKey ? `등록됨 (${aiSettings.maskedKey})` : "sk-..."}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    <a
                      href={PROVIDER_KEY_HELP[provider].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      {PROVIDER_KEY_HELP[provider].label}
                    </a>{" "}
                    — ChatGPT Plus·Claude Pro 구독과는 별개로 발급받는 API 키이며, 사용량만큼 과금됩니다.
                  </p>
                </div>

                <label className="flex items-start gap-2.5 rounded-lg border p-3 text-sm">
                  <Checkbox checked={shareAsDemoPool} onCheckedChange={(v) => setShareAsDemoPool(Boolean(v))} className="mt-0.5" />
                  <span>
                    <span className="font-medium">방문자에게 무료 체험으로 공유</span>
                    <span className="block text-xs text-muted-foreground">
                      포트폴리오를 보는 사람이 키 등록 없이 &quot;데모 계정으로 체험하기&quot;만으로 실제 AI를
                      써볼 수 있게 됩니다. 하루 총 50회, 방문자(IP)당 하루 10회로 한도가 걸려 있어 비용은
                      제한됩니다 — 본인 계정(키를 직접 등록한 계정)으로 쓸 때는 이 한도가 적용되지 않습니다.
                    </span>
                  </span>
                </label>
              </>
            )}
          </CardContent>
          <CardFooter className="flex items-center gap-3">
            <Button type="submit" disabled={savingAi}>
              저장
            </Button>
            {aiSettings?.provider === "local" ? (
              <span className="text-xs text-muted-foreground">현재 로컬 LLM({aiSettings.model})을 사용 중이에요.</span>
            ) : (
              aiSettings?.hasKey && (
                <span className="text-xs text-muted-foreground">
                  현재 {PROVIDER_LABEL[aiSettings.provider]} 키가 등록되어 있어요.
                </span>
              )
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
