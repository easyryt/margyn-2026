"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

export type GeneratedImage = {
  id: string;
  dataUrl: string;
  mimeType: string;
  label: string;
  templateId?: string;
};

type VariantImage = {
  id: string;
  label: string;
  fileName: string;
  blob: Blob;
  url: string;
};

type ExportItem = {
  id: string;
  label: string;
  fileName: string;
  src: string;
  blob?: Blob;
  kind: "original" | "variant";
};

const MAX_BACKGROUNDS = 70;
const MAX_BACKGROUND_BYTES = 30 * 1024 * 1024;
const OUTPUT_SIZE = 1080;

function UploadStackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 13.5v4A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-4" strokeLinecap="round" />
      <path d="M7 10.5h10" strokeLinecap="round" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" strokeLinejoin="round" />
      <path d="m4.5 12 7.5 4.2 7.5-4.2M4.5 16l7.5 4.2 7.5-4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ZipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7V3Z" strokeLinejoin="round" />
      <path d="M14 3v5h5M10 3v2m0 2v2m0 2v2m0 2v2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m6 12.5 3.5 3.5L18 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("An image could not be decoded."));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The image could not be rendered.")), type, quality);
  });
}

function drawCover(context: CanvasRenderingContext2D, image: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const scale = Math.max(OUTPUT_SIZE / sourceWidth, OUTPUT_SIZE / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  context.drawImage(image, (OUTPUT_SIZE - width) / 2, (OUTPUT_SIZE - height) / 2, width, height);
}

type ForegroundPlacement = { x: number; y: number };

function drawForeground(context: CanvasRenderingContext2D, foreground: HTMLImageElement, offset: ForegroundPlacement = { x: 0, y: 0 }) {
  const scale = Math.min(OUTPUT_SIZE / foreground.naturalWidth, OUTPUT_SIZE / foreground.naturalHeight);
  const width = foreground.naturalWidth * scale;
  const height = foreground.naturalHeight * scale;
  context.drawImage(
    foreground,
    (OUTPUT_SIZE - width) / 2 + offset.x,
    (OUTPUT_SIZE - height) / 2 + offset.y,
    width,
    height,
  );
}

function findCenteredForegroundPlacement(foreground: HTMLImageElement): ForegroundPlacement {
  const measurementCanvas = document.createElement("canvas");
  measurementCanvas.width = OUTPUT_SIZE;
  measurementCanvas.height = OUTPUT_SIZE;
  const measurementContext = measurementCanvas.getContext("2d", { willReadFrequently: true });
  if (!measurementContext) return { x: 0, y: 0 };

  drawForeground(measurementContext, foreground);
  const pixels = measurementContext.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE).data;
  const alphaThreshold = 32;
  let left = OUTPUT_SIZE;
  let right = -1;
  let top = OUTPUT_SIZE;
  let bottom = -1;

  for (let y = 0; y < OUTPUT_SIZE; y += 1) {
    for (let x = 0; x < OUTPUT_SIZE; x += 1) {
      if (pixels[(y * OUTPUT_SIZE + x) * 4 + 3] < alphaThreshold) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) return { x: 0, y: 0 };
  return {
    x: Math.round(OUTPUT_SIZE / 2 - (left + right) / 2),
    y: OUTPUT_SIZE - 1 - bottom,
  };
}

function safeBaseName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "background";
}

function extensionFor(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

async function composeBackground(background: HTMLImageElement, foreground: HTMLImageElement, placement: ForegroundPlacement) {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  drawCover(context, background, background.naturalWidth, background.naturalHeight);
  context.save();
  context.filter = "brightness(1.015) contrast(1.01) saturate(0.99)";
  context.shadowColor = "rgba(24, 19, 15, 0.14)";
  context.shadowBlur = 18;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 8;
  drawForeground(context, foreground, placement);
  context.restore();
  return canvasToBlob(canvas);
}

export default function BackgroundBatchStudio({
  generatedImages,
  originalKindLabel = "AI original",
  originalZipFolder = "01-ai-originals",
}: {
  generatedImages: GeneratedImage[];
  originalKindLabel?: string;
  originalZipFolder?: string;
}) {
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const backgroundFilesRef = useRef<File[]>([]);
  const buildJobRef = useRef(0);
  const variantUrlsRef = useRef<string[]>([]);
  const foregroundUrlRef = useRef("");
  const [backgroundFiles, setBackgroundFiles] = useState<File[]>([]);
  const [variants, setVariants] = useState<VariantImage[]>([]);
  const [foregroundUrl, setForegroundUrl] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => () => {
    buildJobRef.current += 1;
    variantUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    if (foregroundUrlRef.current) URL.revokeObjectURL(foregroundUrlRef.current);
  }, []);

  const foregroundSource = generatedImages.find((image) => image.templateId === "hand-closeup") ?? generatedImages[0];
  const foregroundPreview = foregroundUrl || foregroundSource?.dataUrl;

  const allExportItems = useMemo<ExportItem[]>(() => [
    ...generatedImages.map((image, index) => ({
      id: `original-${image.id}`,
      label: image.label,
      fileName: `${String(index + 1).padStart(2, "0")}-${safeBaseName(image.label)}.${extensionFor(image.mimeType)}`,
      src: image.dataUrl,
      kind: "original" as const,
    })),
    ...variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      fileName: variant.fileName,
      src: variant.url,
      blob: variant.blob,
      kind: "variant" as const,
    })),
  ], [generatedImages, variants]);

  const clearRenderedVariants = (cancelRunningJob = true) => {
    if (cancelRunningJob) {
      buildJobRef.current += 1;
      setIsBuilding(false);
    }
    variantUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    variantUrlsRef.current = [];
    if (foregroundUrlRef.current) URL.revokeObjectURL(foregroundUrlRef.current);
    foregroundUrlRef.current = "";
    setForegroundUrl("");
    setVariants([]);
    setSelectedIds(new Set());
    setBuildProgress(0);
  };

  const addBackgrounds = (files: File[]) => {
    const valid = files.filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= MAX_BACKGROUND_BYTES);
    const currentFiles = backgroundFilesRef.current;
    const deduplicated = [...currentFiles, ...valid].filter(
      (file, index, list) => list.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size) === index,
    );
    const limited = deduplicated.slice(0, MAX_BACKGROUNDS);
    const changed = limited.length !== currentFiles.length || limited.some((file, index) => file !== currentFiles[index]);
    if (changed) {
      backgroundFilesRef.current = limited;
      setBackgroundFiles(limited);
      clearRenderedVariants();
    }

    if (valid.length !== files.length) setNotice("Some files were skipped. Use PNG, JPG, or WebP images no larger than 30 MB each.");
    else if (deduplicated.length > MAX_BACKGROUNDS) setNotice(`Only the first ${MAX_BACKGROUNDS} unique backgrounds were added.`);
    else setNotice(`${limited.length} background${limited.length === 1 ? "" : "s"} ready.`);
  };

  const handleBackgroundFiles = (event: ChangeEvent<HTMLInputElement>) => {
    addBackgrounds(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const buildVariants = async () => {
    if (!foregroundSource || !backgroundFiles.length) return;
    setNotice("");
    clearRenderedVariants();
    setIsBuilding(true);
    const jobId = ++buildJobRef.current;

    try {
      const foregroundResponse = await fetch(foregroundSource.dataUrl);
      if (!foregroundResponse.ok) throw new Error("The transparent foreground could not be loaded.");
      const foregroundBlob = await foregroundResponse.blob();
      if (buildJobRef.current !== jobId) return;
      const nextForegroundUrl = URL.createObjectURL(foregroundBlob);
      foregroundUrlRef.current = nextForegroundUrl;
      setForegroundUrl(nextForegroundUrl);
      const foregroundImage = await loadImage(nextForegroundUrl);
      const foregroundPlacement = findCenteredForegroundPlacement(foregroundImage);
      const nextVariants: VariantImage[] = [];
      const failedFiles: string[] = [];

      for (let index = 0; index < backgroundFiles.length; index += 1) {
        if (buildJobRef.current !== jobId) return;
        const file = backgroundFiles[index];
        const backgroundUrl = URL.createObjectURL(file);
        try {
          const backgroundImage = await loadImage(backgroundUrl);
          const blob = await composeBackground(backgroundImage, foregroundImage, foregroundPlacement);
          if (buildJobRef.current !== jobId) return;
          const url = URL.createObjectURL(blob);
          variantUrlsRef.current.push(url);
          nextVariants.push({
            id: `variant-${index}-${file.name}-${file.size}`,
            label: safeBaseName(file.name),
            fileName: `${String(index + 1).padStart(2, "0")}-${safeBaseName(file.name)}-margyn-image.png`,
            blob,
            url,
          });
        } catch {
          failedFiles.push(file.name);
        } finally {
          URL.revokeObjectURL(backgroundUrl);
        }

        setBuildProgress(Math.round(((index + 1) / backgroundFiles.length) * 100));
        if ((index + 1) % 4 === 0) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }

      if (!nextVariants.length) throw new Error("None of the background files could be decoded.");
      if (buildJobRef.current !== jobId) return;
      setVariants(nextVariants);
      setSelectedIds(new Set([
        ...generatedImages.map((image) => `original-${image.id}`),
        ...nextVariants.map((variant) => variant.id),
      ]));
      setNotice(`${nextVariants.length} background variants created locally. No additional AI calls were used.${failedFiles.length ? ` ${failedFiles.length} unreadable file${failedFiles.length === 1 ? " was" : "s were"} skipped.` : ""}`);
    } catch (error) {
      if (buildJobRef.current === jobId) {
        clearRenderedVariants(false);
        setNotice(error instanceof Error ? error.message : "The background variants could not be created.");
      }
    } finally {
      if (buildJobRef.current === jobId) setIsBuilding(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allExportItems.map((item) => item.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const downloadZip = async (mode: "all" | "selected") => {
    const items = mode === "all" ? allExportItems : allExportItems.filter((item) => selectedIds.has(item.id));
    if (!items.length) {
      setNotice("Select at least one image before creating a ZIP.");
      return;
    }

    setIsZipping(true);
    setZipProgress(0);
    setNotice("");
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        let blob = item.blob;
        if (!blob) {
          const response = await fetch(item.src);
          if (!response.ok) throw new Error(`Could not package ${item.label}.`);
          blob = await response.blob();
        }
        const folder = item.kind === "original" ? originalZipFolder : "02-background-variants";
        zip.file(`${folder}/${item.fileName}`, blob);
        setZipProgress(Math.round(((index + 1) / items.length) * 45));
      }

      const archive = await zip.generateAsync(
        { type: "blob", compression: "STORE", streamFiles: true },
        (metadata) => setZipProgress(45 + Math.round(metadata.percent * 0.55)),
      );
      const archiveUrl = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = archiveUrl;
      link.download = mode === "all" ? `margyn-complete-${items.length}-image-set.zip` : `margyn-selected-${items.length}-images.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(archiveUrl), 60_000);
      setNotice(`${items.length} image${items.length === 1 ? "" : "s"} packaged successfully.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The ZIP could not be created.");
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  return (
    <section className="batch-section" aria-labelledby="batch-heading">
      <div className="section-heading batch-heading-row">
        <div>
          <h2 id="batch-heading">Background batch</h2>
        </div>
        <p>Up to 70 backgrounds · 1080px PNG · local processing.</p>
      </div>

      <div className="batch-workspace">
        <aside className="foreground-panel">
          <div className="batch-step-label"><span>03</span><strong>Transparent foreground</strong></div>
          <div className="cutout-preview checkerboard">
            {foregroundPreview && <Image
              src={foregroundPreview}
              alt="Transparent phone, hand, and sleeve foreground"
              fill
              sizes="(max-width: 760px) 90vw, 340px"
              unoptimized
            />}
            <span className="cutout-status is-ready"><CheckIcon /> Transparent source ready</span>
          </div>
          <p>Transparent edges and proportions are preserved.</p>
        </aside>

        <div className="background-panel">
          <div className="batch-step-label"><span>04</span><strong>Add background templates</strong><small>{backgroundFiles.length}/{MAX_BACKGROUNDS}</small></div>
          <input ref={backgroundInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleBackgroundFiles} disabled={isBuilding || isZipping} hidden />
          <div className="background-drop-card">
            <span className="background-upload-icon"><UploadStackIcon /></span>
            <div><strong>Upload up to 70 background images</strong><small>Select all PNG files together. Square images work best.</small></div>
            <button type="button" onClick={() => backgroundInputRef.current?.click()} disabled={isBuilding || isZipping}>Choose backgrounds</button>
          </div>
          <div className="background-actions">
            {backgroundFiles.length > 0 && <button type="button" className="clear-background-button" disabled={isBuilding || isZipping} onClick={() => { backgroundFilesRef.current = []; setBackgroundFiles([]); clearRenderedVariants(); setNotice("Background list cleared."); }}>Clear list</button>}
          </div>
          {backgroundFiles.length > 0 && (
            <div className="background-file-list">
              {backgroundFiles.slice(0, 8).map((file, index) => <span key={`${file.name}-${file.size}`}><i>{String(index + 1).padStart(2, "0")}</i>{file.name}</span>)}
              {backgroundFiles.length > 8 && <span className="more-backgrounds">+ {backgroundFiles.length - 8} more files</span>}
            </div>
          )}
          <button className="build-variants-button" type="button" onClick={() => void buildVariants()} disabled={!backgroundFiles.length || isBuilding}>
            <LayersIcon />
            {isBuilding ? `Creating ${backgroundFiles.length} variants · ${buildProgress}%` : `Create ${backgroundFiles.length || ""} background variant${backgroundFiles.length === 1 ? "" : "s"}`}
          </button>
          {isBuilding && <div className="batch-progress" role="progressbar" aria-label="Creating background variants" aria-valuemin={0} aria-valuemax={100} aria-valuenow={buildProgress}><span style={{ width: `${buildProgress}%` }} /></div>}
          {notice && <p className="batch-notice" role="status">{notice}</p>}
        </div>
      </div>

      {variants.length > 0 && (
        <div className="export-gallery">
          <div className="export-toolbar">
            <div><span className="section-kicker">Export list</span><h3>{allExportItems.length} images ready</h3></div>
            <div className="selection-actions">
              <span>{selectedIds.size} selected</span>
              <button type="button" onClick={selectAll} disabled={isZipping}>Select all</button>
              <button type="button" onClick={clearSelection} disabled={isZipping}>Clear</button>
            </div>
            <div className="zip-actions">
              <button type="button" className="zip-secondary" onClick={() => void downloadZip("selected")} disabled={!selectedIds.size || isZipping}><ZipIcon /> Selected ZIP</button>
              <button type="button" className="zip-primary" onClick={() => void downloadZip("all")} disabled={isZipping}><ZipIcon /> All {allExportItems.length} ZIP</button>
            </div>
          </div>
          {isZipping && <div className="zip-progress" role="progressbar" aria-label="Building ZIP file" aria-valuemin={0} aria-valuemax={100} aria-valuenow={zipProgress}><span style={{ width: `${zipProgress}%` }} /><small>Building ZIP · {zipProgress}%</small></div>}

          <div className="export-grid">
            {allExportItems.map((item, index) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <button
                  type="button"
                  className={`export-card ${isSelected ? "is-selected" : ""}`}
                  key={item.id}
                  onClick={() => toggleSelected(item.id)}
                  disabled={isZipping}
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`${isSelected ? "Deselect" : "Select"} ${item.label}`}
                >
                  <span className="export-image"><Image src={item.src} alt="" fill sizes="(max-width: 680px) 44vw, 210px" unoptimized /></span>
                  <span className="export-select-mark">{isSelected && <CheckIcon />}</span>
                  <span className="export-card-copy"><strong>{String(index + 1).padStart(2, "0")}. {item.label}</strong><small>{item.kind === "original" ? originalKindLabel : "Local composite"}</small></span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
