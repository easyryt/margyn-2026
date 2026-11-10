"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import AiProviderSelector, { useAiProvider } from "../components/ai-provider-selector";
import GenerationScope from "../components/generation-scope";
import { PACK_VIEWS, parsePackQuantity, type PackViewId, type PackViewFailure } from "@/lib/image-generator/charm-pack-options";
import PackResultCard, { type PackImage } from "./pack-result-card";

export default function CharmPacksPage() {
  const aiSelection = useAiProvider();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [quantityInput, setQuantityInput] = useState("5");
  const quantity = parsePackQuantity(quantityInput);
  const [images, setImages] = useState<PackImage[]>([]);
  const [failures, setFailures] = useState<PackViewFailure[]>([]);
  const [error, setError] = useState("");
  const [busyView, setBusyView] = useState<"all" | PackViewId | null>(null);
  const [scope, setScope] = useState<"all" | PackViewId>("pack-fan");
  const busy = busyView !== null;

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  function changeQuantity(value: string) {
    setQuantityInput(value);
    setImages([]);
    setFailures([]);
    setError("");
  }

  function selectFile(next?: File) {
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setError("Please upload a JPG, PNG, or WebP photo.");
      return;
    }
    if (!next.size || next.size > 10 * 1024 * 1024) {
      setError("Choose an image up to 10 MB.");
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(next);
    setPreview(previewRef.current);
    setFile(next);
    setImages([]);
    setFailures([]);
    setError("");
  }

  async function generate(view: "all" | PackViewId = "all") {
    if (busy || !file || quantity === null || !aiSelection.ready) return;
    setBusyView(view);
    setError("");
    if (view === "all") { setImages([]); setFailures([]); }
    const body = new FormData();
    body.set("image", file);
    body.set("quantity", String(quantity));
    body.set("provider", aiSelection.provider);
    body.set("qualityTier", aiSelection.qualityTier);
    body.set("view", view);
    try {
      const response = await fetch("/api/tools/image-generator/generate-charm-pack", { method: "POST", body });
      const payload = await response.json() as { images?: PackImage[]; failures?: PackViewFailure[]; error?: string };
      if (payload.failures) setFailures((previous) => [...previous.filter((failure) => view !== "all" && failure.viewId !== view), ...payload.failures!]);
      if (!response.ok || !payload.images?.length) throw new Error(payload.error || "This pack view could not be generated. Please retry.");
      setImages((previous) => [...previous.filter((image) => !payload.images!.some((next) => next.templateId === image.templateId)), ...payload.images!]
        .sort((a, b) => PACK_VIEWS.findIndex((item) => item.id === a.templateId) - PACK_VIEWS.findIndex((item) => item.id === b.templateId)));
      document.getElementById("pack-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The pack request failed. Please try again.");
    } finally { setBusyView(null); }
  }

  return (
    <main className="workspace-page pack-page">
      <div className="workspace-heading"><div><h1>Charm packs</h1><p>Set the quantity. Add tags after generation.</p></div><span className="workspace-pill">1 upload</span></div>
      <section id="pack-studio" className="charm-studio-section">
        <div className="pack-workspace">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
          <button type="button" className="charm-upload-card pack-upload" disabled={busy} onClick={() => inputRef.current?.click()}>
            <span className="charm-upload-index">01</span>
            <span className="charm-upload-preview">{preview ? <Image src={preview} alt="Your raw charm-pack product" fill sizes="(max-width: 680px) 80vw, 380px" unoptimized /> : <span className="pack-upload-empty"><b>+</b><span>Upload one raw image</span><small>JPG, PNG or WebP · up to 10 MB</small></span>}</span>
            <strong>{file ? "Change product photo" : "Your single product"}</strong><small>{file?.name || "Show the full item against a plain background"}</small>
          </button>
          <div className="pack-controls">
            <h3>Pack quantity</h3>
            <div className="pack-quantity-presets">{[5, 10].map((count) => <button key={count} type="button" disabled={busy} aria-pressed={quantity === count} onClick={() => changeQuantity(String(count))}>{count} Pcs</button>)}</div>
            <div className="pack-quantity-row"><div><label htmlFor="pack-quantity">Number of pieces</label><input id="pack-quantity" type="number" min="1" max="20" step="1" inputMode="numeric" value={quantityInput} disabled={busy} aria-describedby="pack-quantity-help" aria-invalid={quantity === null} onChange={(event) => changeQuantity(event.target.value)} /></div></div>
            <p id="pack-quantity-help" className={quantity === null ? "pack-invalid" : "pack-help"}>{quantity === null ? "Enter a whole number from 1 to 20." : "This controls how many products appear. Images generate without tags."}</p>
            <GenerationScope views={PACK_VIEWS} value={scope} onChange={setScope} disabled={busy} />
            <AiProviderSelector selection={aiSelection} disabled={busy} backgroundVariants={false} />
            <button type="button" className="generate-button" disabled={busy || !file || quantity === null || !aiSelection.ready} onClick={() => void generate(scope)}>{busy ? "Creating & checking your pack…" : `Generate ${scope === "all" ? "2 images" : "1 image"}${quantity === null ? "" : ` · ${quantity} pieces`}`}</button>
            <p className="pack-help" role="status">{busy ? "AI is arranging your products and checking the count. This can take a few minutes." : `${scope === "all" ? "Two" : "One"} 1080 × 1080 PNG. Other views can be generated separately later.`}</p>
          </div>
        </div>
        {error && <p className="charm-error" role="alert">{error}</p>}
      </section>

      {(busy || images.length > 0 || failures.length > 0) && <section id="pack-results" className="charm-results-section" aria-busy={busy}>
        <div className="section-heading"><div><h2>{busy ? "Generating…" : "Results"}</h2></div></div>
        <div className="pack-results-grid">
          {busy ? PACK_VIEWS.filter((view) => busyView === "all" || view.id === busyView).map((view) => <div className="result-skeleton" key={view.id}><span className="skeleton-glow" /><p>Creating {view.label.toLowerCase()}</p></div>)
            : images.map((image) => <PackResultCard key={image.id} image={image} />)}
        </div>
        {failures.map((failure) => <div key={failure.viewId} className="charm-retry-view" role="status"><div><strong>{failure.label} needs another attempt</strong><p>{failure.message}</p></div><button className="app-button" type="button" disabled={busy || !aiSelection.ready} onClick={() => void generate(failure.viewId)}>{busyView === failure.viewId ? "Retrying…" : "Retry this view"}</button></div>)}
      </section>}
      {!busy && !images.length && !failures.length && <div className="workspace-empty">Generated images will appear here.</div>}
    </main>
  );
}
