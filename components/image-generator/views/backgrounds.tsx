"use client";

import { useEffect, useRef, useState } from "react";
import BackgroundBatchStudio, { type GeneratedImage } from "../components/background-batch-studio";

export default function BackgroundsPage() {
  const [source, setSource] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currentUrl = useRef("");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (currentUrl.current) URL.revokeObjectURL(currentUrl.current); }; }, []);

  async function choose(file?: File) {
    if (!file || busy) return;
    if (file.type !== "image/png" || !file.size || file.size > 10 * 1024 * 1024) { setError("Choose a transparent PNG up to 10 MB."); return; }
    setBusy(true); setError("");
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 16_000_000) throw new Error("Use a PNG of at most 16 megapixels.");
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("This browser cannot inspect image transparency.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0, foreground = 0;
      for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] < 32) transparent++; if (pixels[i] > 128) foreground++; }
      if (transparent < pixels.length / 4 * .005 || foreground < pixels.length / 4 * .005) throw new Error("Upload a cutout with real PNG transparency and a visible subject. A solid background or painted checkerboard is not transparent.");
      if (!mounted.current) return;
      const url = URL.createObjectURL(file);
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = url;
      setSource({ id: `${Date.now()}-${file.name}`, dataUrl: url, mimeType: "image/png", label: file.name, templateId: "hand-closeup" });
    } catch (caught) { if (mounted.current) setError(caught instanceof Error ? caught.message : "This PNG could not be read."); }
    finally { bitmap?.close(); if (mounted.current) setBusy(false); }
  }

  return <main className="workspace-page">
    <div className="workspace-heading"><div><h1>Backgrounds</h1><p>Compose a transparent cutout over your backgrounds.</p></div><span className="workspace-pill">Local · no AI credits</span></div>
    <section className="workspace-panel" aria-label="Foreground upload"><h2>Transparent foreground</h2><div className="workspace-upload-row"><label htmlFor="foreground-upload" className="local-upload-label">Upload PNG</label><input id="foreground-upload" type="file" accept="image/png" disabled={busy} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} /><p>{busy ? "Checking transparency…" : "PNG · up to 10 MB / 16 MP"}</p></div>{error && <p className="charm-error" role="alert">{error}</p>}</section>
    {source ? <BackgroundBatchStudio key={source.id} generatedImages={[source]} originalKindLabel="Your original PNG" originalZipFolder="01-original" /> : <div className="workspace-empty">Upload a transparent PNG to start.</div>}
  </main>;
}
