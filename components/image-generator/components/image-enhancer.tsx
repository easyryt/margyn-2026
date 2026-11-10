"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { DEFAULT_ENHANCEMENT, enhanceLocalImage, type EnhancementOptions } from "@/lib/image-generator/local-image-enhancement";

// Key the editor by source so switching a pack tag or uploaded file cannot reuse a stale result.
export default function ImageEnhancer(props: { source: string; name: string; expanded?: boolean }) {
  return <EnhancementEditor key={props.source} {...props} />;
}

function EnhancementEditor({ source, name, expanded = false }: { source: string; name: string; expanded?: boolean }) {
  const id = useId();
  const [options, setOptions] = useState<EnhancementOptions>(DEFAULT_ENHANCEMENT);
  const [result, setResult] = useState<{ dataUrl: string; width: number; height: number } | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function change(next: Partial<EnhancementOptions>) {
    setOptions((previous) => ({ ...previous, ...next }));
    setResult(null);
    setError("");
  }
  async function enhance() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setResult(await enhanceLocalImage(source, options));
      setShowOriginal(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enhancement failed. Your original is unchanged.");
    } finally { setBusy(false); }
  }
  const filename = name.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "image";
  return <details className="image-enhancer" open={expanded || undefined}>
    <summary>Enhance free · no AI credits</summary>
    <div className="enhancement-body">
      <p>Local sharpening, light noise smoothing and optional shadow lift. Original unchanged. No upload or AI request.</p>
      <label htmlFor={`${id}-detail`}>Detail: {options.detail}%</label>
      <input id={`${id}-detail`} type="range" min="0" max="100" step="5" value={options.detail} disabled={busy} onChange={(event) => change({ detail: Number(event.target.value) })} />
      <label className="enhancement-check"><input type="checkbox" checked={options.lighting} disabled={busy} onChange={(event) => change({ lighting: event.target.checked })} /> Gently brighten shadows</label>
      <label htmlFor={`${id}-scale`}>Download size</label>
      <select id={`${id}-scale`} value={options.scale} disabled={busy} onChange={(event) => change({ scale: Number(event.target.value) as 1 | 2 })}>
        <option value="1">Original size (up to 2160px)</option><option value="2">2× resize (up to 2160px)</option>
      </select>
      <p>Resizing preserves proportions and transparency. It does not reconstruct missing detail or fix AI design errors. Large uploads are reduced to a 2160px longest edge.</p>
      <button className="app-button" type="button" disabled={busy} onClick={() => void enhance()}>{busy ? "Enhancing on your device…" : result ? "Enhance again · free" : "Enhance on this device"}</button>
      <span role="status" className="enhancement-status">{busy ? "No AI credits are being used." : result ? `${result.width} × ${result.height} PNG ready` : ""}</span>
      {error && <p role="alert">{error}</p>}
      {result && <>
        <div className="enhancement-compare"><button type="button" aria-pressed={showOriginal} onClick={() => setShowOriginal(true)}>Original</button><button type="button" aria-pressed={!showOriginal} onClick={() => setShowOriginal(false)}>Enhanced</button></div>
        <div className="enhancement-preview checkerboard"><Image src={showOriginal ? source : result.dataUrl} alt={`${showOriginal ? "Original" : "Enhanced"} ${name}`} width={result.width} height={result.height} sizes="(max-width: 760px) 90vw, 500px" unoptimized /></div>
        <a className="app-button enhancement-download" href={result.dataUrl} download={`${filename}-enhanced.png`}>Download enhanced PNG</a>
        <p>This separate download includes any visible tag. Studio originals and background ZIPs stay unchanged.</p>
      </>}
    </div>
  </details>;
}
