import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// export const runtime = "edge";
export const runtime = "nodejs"; 
export const preferredRegion = ["iad1"]; 

export async function POST() {
  try {
    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt:
        "创作一张图片生成透明背景的九个贴纸，有不同表情和动作（开心、快乐、生气等），正方形，平面日系可爱风，实用的表情贴图",
      size: "1024x1024",
      n: 1,
      // ★ 先不用 response_format, 让它返回 URL
    });

    // 取第一张图的临时 URL
    const imageUrl = res.data[0].url as string;

    return NextResponse.json({ ok: true, url: imageUrl });
  } catch (e: any) {
    console.error("OpenAI error →", e);
    return NextResponse.json(
      { ok: false, error: e?.error?.message ?? e.message },
      { status: 500 }
    );
  }
}
