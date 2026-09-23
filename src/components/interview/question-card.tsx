"use client";

import { useState } from "react";
import { HelpCircle, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { InterviewQA } from "@/types/domain";

export function QuestionCard({
  qa,
  onSaveAnswer,
  onRequestFeedback,
}: {
  qa: InterviewQA;
  onSaveAnswer: (answer: string) => void;
  onRequestFeedback: (answer: string) => Promise<void>;
}) {
  const [answer, setAnswer] = useState(qa.answer);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  async function handleFeedback() {
    onSaveAnswer(answer);
    setLoadingFeedback(true);
    try {
      await onRequestFeedback(answer);
    } finally {
      setLoadingFeedback(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="flex items-start gap-1.5 text-sm font-semibold">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {qa.question}
        </p>
        <Textarea
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onBlur={() => onSaveAnswer(answer)}
          placeholder="답변을 작성해보세요 (상황-과제-행동-결과 순서를 추천해요)"
        />
        <Button size="sm" variant="outline" onClick={handleFeedback} disabled={loadingFeedback}>
          {loadingFeedback ? <Loader2 className="animate-spin" /> : <Sparkles />} AI 피드백 받기
        </Button>
        {qa.feedback && (
          <div className="rounded-lg bg-primary/5 p-3 text-sm text-primary">
            <Sparkles className="mr-1 inline size-3.5" />
            {qa.feedback}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
