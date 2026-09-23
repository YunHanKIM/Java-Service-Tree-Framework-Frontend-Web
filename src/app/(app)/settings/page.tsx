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
import { resumeStore } from "@/lib/client/store";
import type { AiProviderName, AiSettings, ResumeProfile } from "@/types/domain";

const PROVIDER_LABEL: Record<AiProviderName, string> = {
  openai: "OpenAI (ChatGPT)",
  anthropic: "Anthropic (Claude)",
};

const PROVIDER_KEY_HELP: Record<AiProviderName, { url: string; label: string }> = {
  openai: { url: "https://platform.openai.com/api-keys", label: "platform.openai.com에서 발급" },
  anthropic: { url: "https://console.anthropic.com/settings/keys", label: "console.anthropic.com에서 발급" },
};

export default function SettingsPage() {
  const [resume, setResume] = useState<ResumeProfile>({ summary: "", skills: [], experienceSummary: "" });
  const [skillsInput, setSkillsInput] = useState("");
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [provider, setProvider] = useState<AiProviderName>("anthropic");
  const [apiKey, setApiKey] = useState("");
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
        body: JSON.stringify({ provider, apiKey: apiKey || undefined }),
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
            서버에만 저장되고 브라우저로 다시 전송되지 않습니다.
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
                </SelectContent>
              </Select>
            </div>
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
          </CardContent>
          <CardFooter className="flex items-center gap-3">
            <Button type="submit" disabled={savingAi}>
              저장
            </Button>
            {aiSettings?.hasKey && (
              <span className="text-xs text-muted-foreground">
                현재 {PROVIDER_LABEL[aiSettings.provider]} 키가 등록되어 있어요.
              </span>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
