// app/page.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import toast, { Toaster } from "react-hot-toast";

export default function Home() {
  /* ---------- 本地状态 ---------- */
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [genPreview, setGenPreview] = useState<string | null>(null);
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
    setGenPreview(null);
    setLoading(true);
    try {
      const imageB64 = uploadPreview ? uploadPreview.split(",")[1] : null;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageB64 }),
      }).then((r) => r.json());

      if (!res.ok) throw new Error(res.error);

      setGenPreview("data:image/png;base64," + res.data); // 页面预览
      await sliceAndDownload(res.data);                   // 裁剪 + 打包

      toast.success("已下载 stickers.zip");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- 裁剪九宫格并 zip ---------- */
  async function sliceAndDownload(b64: string) {
    const img = await loadImage("data:image/png;base64," + b64);
    const size = img.width / 3;
    const zip = new JSZip();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    let index = 1;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, -x * size, -y * size);
        const blob = await new Promise<Blob>((ok) =>
          canvas.toBlob((b) => ok(b!), "image/png")
        );
        zip.file(`sticker-${index}.png`, blob);
        index++;
      }
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob("stickers.zip", zipBlob);
  }

  /* ---------- 工具函数 ---------- */
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

      {/* 生成按钮 */}
      <button
        onClick={generate}
        disabled={loading}
        className="px-6 py-2 bg-black text-white rounded-lg disabled:opacity-50"
      >
        {loading ? "生成中…" : "生成贴纸"}
      </button>

      {/* 生成预览 */}
      {genPreview && (
        <div className="mt-6">
          <p className="mb-2 font-medium">整张贴纸预览 ▼</p>
          <img src={genPreview} className="w-64 border rounded-xl" />
        </div>
      )}
    </main>
  );
}
