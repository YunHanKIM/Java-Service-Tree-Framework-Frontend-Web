"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { NotionSettings } from "@/types/domain";

/** Notion 연동 — 통합 토큰 + 데이터베이스를 등록하면 공고 분석 결과를 그 DB에 페이지로 저장할 수 있다 */
export function NotionSettingsCard() {
  const [settings, setSettings] = useState<NotionSettings | null>(null);
  const [token, setToken] = useState("");
  const [database, setDatabase] = useState("");
  const [databaseTitle, setDatabaseTitle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notion").then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as NotionSettings;
      setSettings(data);
      setDatabase(data.databaseId ?? "");
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || undefined, database }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "저장에 실패했어요.");
        return;
      }
      setSettings(data);
      setDatabase(data.databaseId ?? "");
      setDatabaseTitle(data.databaseTitle);
      setToken("");
      toast.success(`Notion 데이터베이스 "${data.databaseTitle}"에 연결했어요.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notion 연동</CardTitle>
        <CardDescription>
          공고 분석 결과(적합도·일치/보완 경험·준비 항목·자기소개서 피드백)를 내 Notion 데이터베이스에 페이지로 저장해요.
          토큰은 서버에만 저장되고 이 계정에서만 쓰입니다.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          <ol className="list-inside list-decimal space-y-1 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <li>
              <a
                href="https://www.notion.so/profile/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                notion.so/profile/integrations
              </a>
              에서 내부 통합을 만들고 토큰(ntn_...)을 복사해요.
            </li>
            <li>공고를 모을 데이터베이스(표) 페이지에서 ··· → 연결(Connections) → 방금 만든 통합을 추가해요.</li>
            <li>데이터베이스 링크를 아래에 붙여넣고 저장하면 필요한 속성(회사·적합도·마감일 등)이 자동으로 추가돼요.</li>
          </ol>
          <div className="space-y-1.5">
            <Label htmlFor="notionToken">통합 토큰</Label>
            <Input
              id="notionToken"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={settings?.hasToken ? `등록됨 (${settings.maskedToken})` : "ntn_..."}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notionDatabase">데이터베이스 링크 또는 ID</Label>
            <Input
              id="notionDatabase"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="https://www.notion.so/workspace/...?v=..."
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !database.trim()}>
            {saving ? "연결 확인 중..." : "연결 확인 후 저장"}
          </Button>
          {settings?.hasToken && settings.databaseId && (
            <span className="text-xs text-muted-foreground">
              {databaseTitle ? `"${databaseTitle}"에 연결됨` : "연결되어 있어요."}
            </span>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
