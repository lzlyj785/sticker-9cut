import { NextResponse } from "next/server";

export const runtime = "edge";

const ACCOUNT = process.env.CF_ACCOUNT_ID!;
const TOKEN   = process.env.CF_API_TOKEN!;

/* 模型常量 */
const MODEL_TEXT2IMG =
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}` +
  `/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;
const MODEL_IMG2IMG =
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}` +
  `/ai/run/@cf/stabilityai/stable-diffusion-xl-img2img-1.0`; // 官方 img2img 端点

export async function POST(req: Request) {
  try {
    const { imageB64, prompt: userPrompt = "" } = await req.json();

    /* ---------- 共同 prompt ---------- */
    const defaultPrompt =
      "九宫格贴纸, 平面日系可爱风, sticker sheet, transparent background";
    const prompt = `${userPrompt.trim()} ${defaultPrompt}`.trim();

    /* ---------- 选择模型 & 拼请求体 ---------- */
    let url = MODEL_TEXT2IMG;
    const body: Record<string, any> = { prompt };

    if (imageB64) {
      url = MODEL_IMG2IMG;
      body.image = `data:image/png;base64,${imageB64}`;
      body.strength = 0.35;          // 0=最像原图, 1=完全重绘
    }

    const cfRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    /* ---------- 解析返回 ---------- */
    const resp = await cfRes.json();           // 两个模型都返回 JSON
    const b64 =
      typeof resp === "string"
        ? resp
        : resp.result?.image || resp.result?.response || resp.result;

    if (!b64 || typeof b64 !== "string")
      throw new Error("CF response missing base64 string");

    return NextResponse.json({ ok: true, data: b64 });
  } catch (e: any) {
    console.error("CF AI error →", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
