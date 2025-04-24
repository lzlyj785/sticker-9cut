import { NextResponse } from "next/server";

export const runtime = "edge";

const ACCOUNT = process.env.CF_ACCOUNT_ID!;
const TOKEN   = process.env.CF_API_TOKEN!;

const MODEL_URL =
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}` +
  `/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;   // lightning 版可把末尾改 -lightning

export async function POST(req: Request) {
  try {
    const { imageB64, prompt: userPrompt = "" } = await req.json();

    const defaultPrompt =
      "九宫格贴纸, 透明背景, 平面日系可爱风, sticker sheet, transparent background";

    const body: Record<string, any> = {
      prompt: `${userPrompt.trim()} ${defaultPrompt}`.trim(),
    };

    if (imageB64) {
      body.image = `data:image/png;base64,${imageB64}`;
      body.strength = 0.3;
    }

    const cfRes = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    /* ---------- 统一拿到 JSON 或二进制 ---------- */
    const ctype = cfRes.headers.get("content-type") || "";
    let base64: string | undefined;

    if (ctype.includes("application/json")) {
      const raw = await cfRes.json();

      // 把前 500 个字符打印，便于你在 Vercel 日志里查看实际结构
      console.log(
        "CF raw json →",
        JSON.stringify(raw).slice(0, 500) + " ...[truncated]"
      );

      base64 = bruteFindBase64(raw);
    } else {
      const buf = Buffer.from(await cfRes.arrayBuffer());
      base64 = buf.toString("base64");
    }

    if (!base64) throw new Error("Unable to locate base64 in CF response");

    return NextResponse.json({ ok: true, data: base64 });
  } catch (e: any) {
    console.error("CF AI error →", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

/* ---------- 递归扫描对象，找第一个大块 base64 ---------- */
function bruteFindBase64(obj: any): string | undefined {
  if (!obj || typeof obj !== "object") return;

  const queue: any[] = [obj];
  while (queue.length) {
    const cur = queue.shift();
    for (const val of Object.values(cur)) {
      if (typeof val === "string" && val.length > 1000 && /^[A-Za-z0-9+/]+=*$/.test(val.slice(0, 1000))) {
        return val;
      } else if (typeof val === "object" && val) {
        queue.push(val);
      }
    }
  }
}
