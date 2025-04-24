// app/api/generate/route.ts
import { NextResponse } from "next/server";

/* ---------- 运行时配置 ---------- */
export const runtime = "edge";          // Edge Runtime → 无 10 s 限制
// 若需要固定机房，可保留 ↓；否则整行删掉
export const preferredRegion = ["iad1"]; // Cloudflare 亚洲机房有时慢

/* ---------- 环境变量 ---------- */
const ACCOUNT  = process.env.CF_ACCOUNT_ID!;
const TOKEN    = process.env.CF_API_TOKEN!;

const MODEL_URL =
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}` +
  `/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;   // ⚡ 若想更快用 lightning 把末尾改 -lightning

/* ---------- 接口 ---------- */
export async function POST(req: Request) {
  try {
    const { imageB64 } = await req.json();     // 前端可不传

    const body: Record<string, any> = {
      prompt:
        "创作一张图片生成透明背景的九个贴纸，有不同表情和动作（开心、快乐、生气等），正方形，平面日系可爱风，实用的表情贴图, sticker sheet, transparent background",
    };

    if (imageB64) {
      body.image = `data:image/png;base64,${imageB64}`; // 带上参考图
      body.strength = 0.35;                              // 0~1 越小越像原图
    }

    /* --- 调用 Cloudflare Workers AI --- */
    const cfRes = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    /* --- 兼容返回 JSON 或 PNG 二进制 --- */
    const ctype = cfRes.headers.get("content-type") || "";
    let base64: string;

    if (ctype.includes("application/json")) {
      const j = await cfRes.json();
      if (!j.result) throw new Error(JSON.stringify(j));
      base64 = j.result;                            // 已是 base64
    } else {
      const buf = Buffer.from(await cfRes.arrayBuffer());
      base64 = buf.toString("base64");
    }

    return NextResponse.json({ ok: true, data: base64 });
  } catch (e: any) {
    console.error("CF AI error →", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
