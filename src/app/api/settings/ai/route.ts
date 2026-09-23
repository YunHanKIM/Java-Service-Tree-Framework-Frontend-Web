import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/server/session";
import { getStoredAiSettings, saveAiSettings, toPublicAiSettings } from "@/lib/server/settings-store";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json(toPublicAiSettings(getStoredAiSettings(userId)));
}

const bodySchema = z.object({
  provider: z.enum(["openai", "anthropic"]),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  shareAsDemoPool: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "입력값을 확인해주세요." }, { status: 400 });

  const saved = saveAiSettings(userId, parsed.data);
  return NextResponse.json(toPublicAiSettings(saved));
}
