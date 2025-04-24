import { NextResponse } from "next/server";

export const runtime = "edge";

const ACCOUNT = process.env.CF_ACCOUNT_ID!;
const TOKEN   = process.env.CF_API_TOKEN!;

const MODEL_TEXT2IMG =
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}` +
  `/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;
const MODEL_IMG2IMG =
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}` +
  `/ai/run/@cf/stabilityai/stable-diffusion-xl-img2img-1.0`;

export async function POST(req: Request) {
  try {
    const { imageB64, prompt: userPrompt = "" } = await req.json();

    const defaultPrompt =
      "九宫格贴纸, 平面日系可爱风, sticker sheet, transparent background";

    const body: Record<string, any> = {
      prompt: `${userPrompt.trim()} ${defaultPrompt}`.trim(),
    };

    let url = MODEL_TEXT2IMG;
    if (imageB64) {
      url = MODEL_IMG2IMG;
      body.image = `data:image/png;base64,${imageB64}`;
      body.strength = 0.35;
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

    const resp = await cfRes.json();

    /* --- ⬇⬇ Debug：打印完整返回，供你/我查看 --- */
    console.log(
      "CF full response →",
      JSON.stringify(resp).slice(0, 800) + " ...[truncated]"
    );

    /* --- 先处理 Cloudflare 错误 --- */
    if (resp.success === false || resp.errors?.length) {
      const msg = resp.errors?.[0]?.message || "Workers AI unknown error";
      throw new Error(msg);
    }

    /* --- 提取 base64 字符串（多重兜底） --- */
    const base64 =
      resp.result?.image ??
      resp.result?.response ??
      (typeof resp.result === "string" ? resp.result : undefined);

    if (!base64)
      throw new Error(
        "No base64 image found. Model returned: " + JSON.stringify(resp).slice(0, 200)
      );

    return NextResponse.json({ ok: true, data: base64 });
  } catch (e: any) {
    console.error("CF AI error →", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
