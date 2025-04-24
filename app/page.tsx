// app/page.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import toast, { Toaster } from "react-hot-toast";

export default function Home() {
  /* ---------- React 状态 ---------- */
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [genPreviewUrl, setGenPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ---------- 拖拽上传 ---------- */
  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  /* ---------- 生成贴纸 ---------- */
  async function generate() {
    setGenPreviewUrl(null);
    setLoading(true);
    try {
      const imageB64 = uploadPreview ? uploadPreview.split(",")[1] : null;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageB64, prompt }),
      }).then((r) => r.json());

      if (!res.ok) throw new Error(res.error);

      /* --- 预览：用 Blob URL 避免 data: URL 被拦截 --- */
      const blob = b64toBlob(res.data, "image/png");
      const localUrl = URL.createObjectURL(blob);
      setGenPreviewUrl(localUrl);

      /* --- 裁剪 + 下载 ZIP --- */
      await sliceAndDownload(res.data);

      toast.success("已下载 stickers.zip");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- 裁剪九宫格并打包 ---------- */
  async function sliceAndDownload(b64: string) {
    const img = await loadImage("data:image/png;base64," + b64);
    const size = img.width / 3;
    const zip = new JSZip();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    let idx = 1;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, -x * size, -y * size);
        const blob = await new Promise<Blob>((ok) =>
          canvas.toBlob((b) => ok(b!), "image/png")
        );
        zip.file(`sticker-${idx}.png`, blob);
        idx++;
      }
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob("stickers.zip", zipBlob);
  }

  /* ---------- 辅助 ---------- */
  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((ok, err) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = err;
      i.src = src;
    });
  }
  function downloadBlob(name: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  function b64toBlob(b64: string, mime: string) {
    const bin = atob(b64);
    const len = bin.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /* ---------- UI ---------- */
  return (
    <main className="flex min-h-screen flex-col items-center p-6 gap-6">
      <Toaster />
      <h1 className="text-2xl font-bold">九宫格表情贴纸生成器</h1>

      {/* 上传框 */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl w-64 h-64 flex items-center justify-center text-center cursor-pointer ${
          isDragActive ? "bg-gray-100" : ""
        }`}
      >
        <input {...getInputProps()} />
        {uploadPreview ? (
          <img src={uploadPreview} className="object-contain max-h-60" />
        ) : (
          <span>拖拽或点击上传一张图片（可选）</span>
        )}
      </div>

      {/* 自定义提示词输入 */}
      <input
        type="text"
        placeholder="自定义提示词（留空使用默认）"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="border rounded w-64 p-2"
      />

      {/* 生成按钮 */}
      <button
        onClick={generate}
        disabled={loading}
        className="px-6 py-2 bg-black text-white rounded-lg disabled:opacity-50"
      >
        {loading ? "生成中…" : "生成贴纸"}
      </button>

      {/* 预览 */}
      {genPreviewUrl && (
        <div className="mt-6">
          <p className="mb-2 font-medium">整张贴纸预览 ▼</p>
          <img src={genPreviewUrl} className="w-64 border rounded-xl" />
        </div>
      )}
    </main>
  );
}
