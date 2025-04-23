import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const prompt =
      "创作一张图片生成透明背景的九个贴纸，有不同的表情跟动作（开心、快乐、生气等），正方形，平面日系可爱风，实用的表情贴图";

    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      n: 1,
      response_format: "b64_json",
      user: "sticker-mvp",
    });

    return NextResponse.json({ ok: true, data: res.data[0].b64_json });
  } catch (e: any) {
    console.error("OpenAI error →", e);          // 方便调试
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
