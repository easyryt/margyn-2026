"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import BackgroundBatchStudio, { type GeneratedImage } from "../components/background-batch-studio";
import AiProviderSelector, { useAiProvider } from "../components/ai-provider-selector";
import GenerationScope from "../components/generation-scope";
import ImageEnhancer from "../components/image-enhancer";
import { CHARM_VIEW_IDS, type CharmViewFailure, type CharmViewId } from "@/lib/image-generator/charm-view-options";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const CHARM_LAYOUT_PREVIEWS = [
  { id: "hand-closeup", src: "/templates/layout-hand-closeup-transparent.png", label: "Hand, cover & charm" },
  { id: "charm-product-flatlay", src: "/templates/charm-product-flatlay-template.jpeg", label: "Cover & charm flatlay" },
  { id: "charm-only", src: "/templates/charm-only-template.jpeg", label: "Charm only" },
] as const;

function fileLabel(file: File | null, fallback: string) {
  return file?.name || fallback;
}

export default function CharmsPage() {
  const aiSelection = useAiProvider();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const charmInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewUrlRef = useRef("");
  const charmPreviewUrlRef = useRef("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [charmFile, setCharmFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [charmPreviewUrl, setCharmPreviewUrl] = useState("");
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [failures, setFailures] = useState<CharmViewFailure[]>([]);
  const [requestedView, setRequestedView] = useState<"all" | CharmViewId>("all");
  const [scope, setScope] = useState<"all" | CharmViewId>("hand-closeup");

  useEffect(() => () => {
    if (coverPreviewUrlRef.current) URL.revokeObjectURL(coverPreviewUrlRef.current);
    if (charmPreviewUrlRef.current) URL.revokeObjectURL(charmPreviewUrlRef.current);
  }, []);

  const selectUpload = (kind: "cover" | "charm", file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image for both the cover and the charm.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Each raw product image must be smaller than 10 MB.");
      return;
    }
    const previousUrl = kind === "cover" ? coverPreviewUrlRef.current : charmPreviewUrlRef.current;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const nextUrl = URL.createObjectURL(file);
    if (kind === "cover") {
      coverPreviewUrlRef.current = nextUrl;
      setCoverFile(file);
      setCoverPreviewUrl(nextUrl);
    } else {
      charmPreviewUrlRef.current = nextUrl;
      setCharmFile(file);
      setCharmPreviewUrl(nextUrl);
    }
    setResults([]);
    setFailures([]);
    setError("");
  };

  const handleFileInput = (kind: "cover" | "charm", event: ChangeEvent<HTMLInputElement>) => {
    selectUpload(kind, event.target.files?.[0]);
    event.target.value = "";
  };

  const generate = async (view: "all" | CharmViewId = "all") => {
    if (isGenerating) return;
    if (!aiSelection.ready) {
      setError("Choose a configured AI provider before generating.");
      return;
    }
    if (!coverFile || !charmFile) {
      setError("Upload both a raw cover photo and a raw charm photo first.");
      return;
    }
    setIsGenerating(true);
    setRequestedView(view);
    setError("");
    if (view === "all") {
      setResults([]);
      setFailures([]);
    }
    const formData = new FormData();
    formData.append("cover", coverFile);
    formData.append("charm", charmFile);
    formData.append("provider", aiSelection.provider);
    formData.append("qualityTier", aiSelection.qualityTier);
    formData.append("view", view);
    try {
      const response = await fetch("/api/tools/image-generator/generate-charms", { method: "POST", body: formData });
      const payload = (await response.json()) as { images?: GeneratedImage[]; failures?: CharmViewFailure[]; error?: string };
      if (payload.failures) setFailures((previous) => view === "all" ? payload.failures! : [...previous.filter((failure) => failure.viewId !== view), ...payload.failures!]);
      if (!response.ok || !payload.images?.length) {
        throw new Error(payload.error || "This charm view could not be generated. Please retry it.");
      }
      setResults((previous) => {
        const updated = view === "all" ? payload.images! : [...previous.filter((image) => !payload.images!.some((next) => next.templateId === image.templateId)), ...payload.images!];
        return updated.sort((left, right) => CHARM_VIEW_IDS.indexOf(left.templateId as CharmViewId) - CHARM_VIEW_IDS.indexOf(right.templateId as CharmViewId));
      });
      window.setTimeout(() => document.getElementById("charm-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The charm image generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="workspace-page">
      <div className="workspace-heading"><div><h1>Cover & charm</h1><p>Upload both products and choose an output view.</p></div><span className="workspace-pill">2 uploads</span></div>
      <section id="charm-studio" className="charm-studio-section">
        <div className="charm-upload-workspace">
          <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => handleFileInput("cover", event)} />
          <input ref={charmInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => handleFileInput("charm", event)} />
          <button className="charm-upload-card" type="button" onClick={() => coverInputRef.current?.click()} disabled={isGenerating}>
            <span className="charm-upload-index">01</span>
            <span className="charm-upload-preview">{coverPreviewUrl ? <Image src={coverPreviewUrl} alt="Raw phone cover upload" fill sizes="(max-width: 760px) 42vw, 310px" unoptimized /> : <b>+</b>}</span>
            <strong>Raw phone cover</strong><small>{fileLabel(coverFile, "The cover photo may include its attached charm")}</small>
          </button>
          <button className="charm-upload-card" type="button" onClick={() => charmInputRef.current?.click()} disabled={isGenerating}>
            <span className="charm-upload-index">02</span>
            <span className="charm-upload-preview">{charmPreviewUrl ? <Image src={charmPreviewUrl} alt="Raw charm upload" fill sizes="(max-width: 760px) 42vw, 310px" unoptimized /> : <b>+</b>}</span>
            <strong>Your charm accessory</strong><small>{fileLabel(charmFile, "Show the complete charm and its clasp, loop, or cord")}</small>
          </button>
          <div className="charm-generate-card">
            <strong>Generation settings</strong>
            <GenerationScope views={CHARM_LAYOUT_PREVIEWS} value={scope} onChange={setScope} disabled={isGenerating} />
            <AiProviderSelector selection={aiSelection} disabled={isGenerating} />
            <button type="button" className="generate-button" onClick={() => void generate(scope)} disabled={isGenerating || !coverFile || !charmFile || !aiSelection.ready}>{isGenerating ? "Creating and checking your images…" : scope === "all" ? "Create all 3 charm images" : `Create 1 image · ${aiSelection.qualityTier === "quality" ? aiSelection.provider === "openai" ? "Flare low" : "high quality" : "economy"}`}</button>
          </div>
        </div>
        {error && <p className="charm-error" role="alert">{error}</p>}
      </section>

      {(isGenerating || results.length > 0 || failures.length > 0) && <section id="charm-results" className="charm-results-section">
        <div className="section-heading"><div><h2>{isGenerating ? "Generating…" : "Results"}</h2></div></div>
        <div className="charm-results-grid">
          {isGenerating
            ? CHARM_LAYOUT_PREVIEWS.filter((layout) => requestedView === "all" || layout.id === requestedView).map((layout) => <div className="result-skeleton" key={layout.src}><span className="skeleton-glow" /><p>Building {layout.label}</p></div>)
            : results.map((result) => <article className="result-card" key={result.id}><div className={`result-image ${result.templateId === "hand-closeup" ? "checkerboard" : ""}`}><Image src={result.dataUrl} alt={result.label} fill sizes="(max-width: 760px) 92vw, 30vw" unoptimized /></div><div className="result-footer"><span><strong>{result.label}</strong><small>{result.templateId === "hand-closeup" ? "Transparent master" : "AI product view"}</small></span><a href={result.dataUrl} download={`margyn-${result.templateId}.png`} aria-label={`Download ${result.label}`}>↓</a></div><ImageEnhancer source={result.dataUrl} name={`margyn-${result.templateId}`} /></article>)}
        </div>
        {failures.map((failure) => <div key={failure.viewId} className="charm-retry-view" role="status"><div><strong>{failure.label} needs another attempt</strong><p>{failure.message}</p></div><button className="app-button" type="button" disabled={isGenerating || !aiSelection.ready} onClick={() => void generate(failure.viewId)}>{isGenerating && requestedView === failure.viewId ? "Repairing…" : "Retry this view"}</button></div>)}
      </section>}

      {results.some((image) => image.templateId === "hand-closeup") && (
        <div id="charm-batch">
          <BackgroundBatchStudio key={results[0].id} generatedImages={results} originalKindLabel="AI charm original" originalZipFolder="01-ai-charm-originals" />
        </div>
      )}

      {!isGenerating && !results.length && !failures.length && <div className="workspace-empty">Generated images will appear here.</div>}
    </main>
  );
}
