// app/api/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";          // ❶ 改成 nodejs
export const preferredRegion = ["iad1"];  // ❷ 可选，锁定美东机房

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST() {
  try {
    const res = await openai.images.generate({
      model: "dall-e-2",
      // prompt:
      //   "创作一张图片生成透明背景的九个贴纸，有不同表情和动作（开心、快乐、生气等），正方形，平面日系可爱风，实用的表情贴图",
      prompt: "A cute cat sticker sheet, transparent background",

      size: "1024x1024",
      n: 1,
    });

    return NextResponse.json({ ok: true, url: res.data[0].url });
  } catch (e: any) {
    console.error("OpenAI error →", JSON.stringify(e, null, 2));
    return NextResponse.json(
      { ok: false, error: e?.error?.message ?? e.message },
      { status: 500 },
    );
  }
}
