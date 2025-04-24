// app/api/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge";

const ACCOUNT = process.env.CF_ACCOUNT_ID!;
const TOKEN   = process.env.CF_API_TOKEN!;

const MODEL_URL =
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}` +
  `/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;     // 快速版可换 lightning

export async function POST(req: Request) {
  try {
    /* ---------- 接收前端数据 ---------- */
    const { imageB64, prompt: userPrompt = "" } = await req.json();

    /* ---------- 组织请求体 ---------- */
    const defaultPrompt =
      "九宫格贴纸, 透明背景, 平面日系可爱风, sticker sheet, transparent background";
    const body: Record<string, any> = {
      prompt: `${userPrompt.trim()} ${defaultPrompt}`.trim(),
    };

    if (imageB64) {
      body.image = `data:image/png;base64,${imageB64}`;
      body.strength = 0.3;                // 0=最像原图, 1=完全重新生成
    }

    /* ---------- 调 Cloudflare Workers AI ---------- */
    const aiRes = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const ctype = aiRes.headers.get("content-type") || "";
    let base64: string;

    if (ctype.includes("application/json")) {
      const j = await aiRes.json();
      if (!j.result) throw new Error(JSON.stringify(j));
      base64 = j.result;
    } else {
      const buf = Buffer.from(await aiRes.arrayBuffer());
      base64 = buf.toString("base64");
    }

    return NextResponse.json({ ok: true, data: base64 });
  } catch (e: any) {
    console.error("CF AI error →", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
