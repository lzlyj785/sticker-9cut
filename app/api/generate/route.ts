import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  const ACCOUNT = process.env.CF_ACCOUNT_ID!;
  const TOKEN   = process.env.CF_API_TOKEN!;

  const url =
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/` +
    `@cf/stabilityai/stable-diffusion-xl-base-1.0`;   // or -lightning

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        // Accept 不一定生效，仍保留
        "Accept": "application/json",
      },
      body: JSON.stringify({
        prompt:
          "创作一张图片生成透明背景的九个贴纸，有不同表情和动作（开心、快乐、生气等），正方形，平面日系可爱风，实用的表情贴图, sticker sheet, transparent background",
      }),
    });

    const ctype = res.headers.get("content-type") || "";
    let b64: string;

    if (ctype.includes("application/json")) {
      // 🎯 正常 JSON
      const j = await res.json();
      if (!j.result) throw new Error(JSON.stringify(j));
      b64 = j.result;                          // 已是 base64
    } else {
      // 🎯 返回的是 PNG 二进制，手动转 base64
      const buf = Buffer.from(await res.arrayBuffer());
      b64 = buf.toString("base64");
    }

    return NextResponse.json({ ok: true, data: b64 });
  } catch (e: any) {
    console.error("CF AI error →", e);
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 },
    );
  }
}
