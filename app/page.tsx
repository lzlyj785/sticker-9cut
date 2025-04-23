"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import toast, { Toaster } from "react-hot-toast";

export default function Home() {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  async function generate() {
    if (!preview) return toast.error("先上传一张图片");
    setLoading(true);
    try {
      const base64 = preview.split(",")[1]; // 去掉 data:image/png;base64,
      const res = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ imageB64: base64 }),
        headers: { "Content-Type": "application/json" },
      }).then((r) => r.json());

      if (!res.ok) throw new Error(res.error);

      // await sliceAndDownload(res.data); // 裁剪+打包
      alert("生成成功！图片地址如下，复制到浏览器可查看：\n\n" + res.url);
      return; // 先结束函数，后面裁剪逻辑暂时不执行
      toast.success("已下载 stickers.zip");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  /** 把 GPT 返回的 b64 图片裁成 9 张并 zip */
  async function sliceAndDownload(b64: string) {
    const img = await loadImage("data:image/png;base64," + b64);
    const size = img.width / 3; // 每格大小

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

  /* 小工具 ↓↓↓ */
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

  return (
    <main className="flex min-h-screen flex-col items-center p-6 gap-6">
      <Toaster />
      <h1 className="text-2xl font-bold">九宫格表情贴纸生成器 (MVP)</h1>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl w-64 h-64 flex items-center justify-center text-center cursor-pointer ${
          isDragActive ? "bg-gray-100" : ""
        }`}
      >
        <input {...getInputProps()} />
        {preview ? (
          /* 预览上传的原图 */
          <img src={preview} className="object-contain max-h-60" />
        ) : (
          <span>拖拽或点击上传一张图片</span>
        )}
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="px-6 py-2 bg-black text-white rounded-lg disabled:opacity-50"
      >
        {loading ? "生成中…" : "生成贴纸"}
      </button>
    </main>
  );
}
