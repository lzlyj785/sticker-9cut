// 引入依赖保持不变
import { NextResponse } from "next/server";

export const runtime = "nodejs";          // 保持 Node 运行时
export const preferredRegion = ["iad1"];  // 任意美区机房

export async function POST() {
  try {
    // ① 读取 Cloudflare 账号和 Token
    const ACCOUNT = process.env.CF_ACCOUNT_ID!;
    const TOKEN   = process.env.CF_API_TOKEN!;

    // ② 组织请求
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`, // :contentReference[oaicite:2]{index=2}
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt:
            "创作一张图片生成透明背景的九个贴纸，有不同表情和动作（开心、快乐、生气等），正方形，平面日系可爱风，实用的表情贴图, sticker sheet, transparent background",
          // 可选参数：num_steps, seed …
        }),
      }
    ).then((r) => r.json());

    if (!resp.result) throw new Error(JSON.stringify(resp));

    // resp.result 是 base64 字符串 → 与 OpenAI 的 b64_json 完全相同
    return NextResponse.json({ ok: true, data: resp.result });
  } catch (e: any) {
    console.error("CF AI error →", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
