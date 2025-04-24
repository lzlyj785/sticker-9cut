// app/api/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge";               // 无 10 s 限制

/* ---------- 你的 Cloudflare 账号信息 ---------- */
const ACCOUNT = process.env.CF_ACCOUNT_ID!;
const TOKEN   = process.env.CF_API_TOKEN!;

/* ---------- 模型地址（需要更快可换 lightning） ---------- */
const MODEL_URL =
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}` +
  `/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;

export async function POST(req: Request) {
  try {
    /* ---------- 解析前端 payload ---------- */
    const { imageB64, prompt: userPrompt = "" } = await req.json();

    const defaultPrompt =
      "九宫格贴纸, 透明背景, 平面日系可爱风, sticker sheet, transparent background";

    const body: Record<string, any> = {
      prompt: `${userPrompt.trim()} ${defaultPrompt}`.trim(),
    };

    if (imageB64) {
      body.image = `data:image/png;base64,${imageB64}`;
      body.strength = 0.3; // 越小越贴近原图
    }

    /* ---------- 调用 Cloudflare Workers AI ---------- */
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

    /* ---------- 抽取 base64，无论 JSON 还是 PNG ---------- */
    let base64: string | undefined;

    if (ctype.includes("application/json")) {
      const raw = await aiRes.json();
      // 兼容三种常见结构
      if (typeof raw === "string") base64 = raw;
      else if (typeof raw.result === "string") base64 = raw.result;
      else if (typeof raw.result === "object" && raw.result) {
        base64 =
          raw.result.image ??
          raw.result.response ??
          Object.values(raw.result)[0];
      }
    } else {
      // 服务器直接返回 PNG
      const buf = Buffer.from(await aiRes.arrayBuffer());
      base64 = buf.toString("base64");
    }

    if (!base64) throw new Error("No base64 field found in CF response");

    return NextResponse.json({ ok: true, data: base64 });
  } catch (e: any) {
    console.error("CF AI error →", e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 },
    );
  }
}
