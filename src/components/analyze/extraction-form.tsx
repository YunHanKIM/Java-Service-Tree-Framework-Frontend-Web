"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExtractedPosting } from "@/types/domain";

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function ExtractionForm({
  extracted,
  onSubmit,
}: {
  extracted: ExtractedPosting;
  onSubmit: (data: ExtractedPosting) => void;
}) {
  const [form, setForm] = useState({
    company: extracted.company,
    title: extracted.title,
    location: extracted.location,
    employmentType: extracted.employmentType,
    deadline: extracted.deadline ?? "",
    requiredSkills: extracted.requiredSkills.join(", "),
    preferredSkills: extracted.preferredSkills.join(", "),
    responsibilities: extracted.responsibilities.join("\n"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      company: form.company.trim(),
      title: form.title.trim(),
      location: form.location.trim(),
      employmentType: form.employmentType.trim(),
      deadline: form.deadline || null,
      requiredSkills: splitList(form.requiredSkills),
      preferredSkills: splitList(form.preferredSkills),
      responsibilities: form.responsibilities
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>추출 결과 확인·수정</CardTitle>
        <Badge variant="secondary">AI 자동 추출</Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="회사명">
              <Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} required />
            </Field>
            <Field label="직무명">
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="근무지">
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </Field>
            <Field label="경력·고용형태">
              <Input value={form.employmentType} onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))} />
            </Field>
          </div>
          <Field label="마감일">
            <Input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
          </Field>
          <Field label="필수 기술 (쉼표로 구분)">
            <Input value={form.requiredSkills} onChange={(e) => setForm((f) => ({ ...f, requiredSkills: e.target.value }))} />
          </Field>
          <Field label="우대 기술 (쉼표로 구분)">
            <Input value={form.preferredSkills} onChange={(e) => setForm((f) => ({ ...f, preferredSkills: e.target.value }))} />
          </Field>
          <Field label="주요 업무 (줄바꿈으로 구분)">
            <Textarea rows={3} value={form.responsibilities} onChange={(e) => setForm((f) => ({ ...f, responsibilities: e.target.value }))} />
          </Field>
          <Button type="submit" className="w-full">
            <CheckCircle2 /> 저장하고 이력서와 비교분석
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
