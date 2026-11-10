"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import BackgroundBatchStudio, {
  type GeneratedImage,
} from "../components/background-batch-studio";
import AiProviderSelector, {
  useAiProvider,
} from "../components/ai-provider-selector";
import ImageEnhancer from "../components/image-enhancer";
import PhoneModelSelector from "../components/phone-model-selector";
import {
  DEFAULT_PHONE_MODEL,
  getPhoneModel,
  type PhoneModelId,
} from "@/lib/image-generator/phone-models";
import type { CoverAssessment } from "@/lib/image-generator/cover-identity";
import type {
  AiProvider,
  AiQualityTier,
  CoverRenderMode,
} from "@/lib/image-generator/ai-provider-options";
import { COVER_LAYOUTS } from "@/lib/image-generator/cover-layouts";

type IconProps = { className?: string };

const TEMPLATE_SET = COVER_LAYOUTS.map((layout) => ({
  ...layout,
  src: `/${layout.file}`,
}));
type CoverView = (typeof TEMPLATE_SET)[number]["id"];
type CoverImage = GeneratedImage & {
  phoneModelId: string;
  phoneModelLabel: string;
  rearCameras: number;
  verified: boolean;
  review?: CoverAssessment;
  provider?: AiProvider;
  qualityTier?: AiQualityTier;
  imageModel?: string;
  renderMode?: CoverRenderMode;
  backgroundReady?: boolean;
};
type CoverFailure = { viewId: CoverView; label: string; message: string };

function SparklesIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2.75c.44 4.04 2.46 6.06 6.5 6.5-4.04.44-6.06 2.46-6.5 6.5-.44-4.04-2.46-6.06-6.5-6.5 4.04-.44 6.06-2.46 6.5-6.5Z"
        fill="currentColor"
      />
      <path
        d="M19.1 15.4c.18 1.67 1.03 2.52 2.7 2.7-1.67.19-2.52 1.03-2.7 2.7-.18-1.67-1.03-2.51-2.7-2.7 1.67-.18 2.52-1.03 2.7-2.7ZM4.45 14.1c.13 1.16.71 1.74 1.87 1.87-1.16.12-1.74.71-1.87 1.87-.12-1.16-.71-1.75-1.87-1.87 1.16-.13 1.75-.71 1.87-1.87Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UploadIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        d="m6 12.5 3.5 3.5L18 7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CornerMarks() {
  return (
    <>
      <span className="corner-mark corner-mark-tl" />
      <span className="corner-mark corner-mark-tr" />
      <span className="corner-mark corner-mark-bl" />
      <span className="corner-mark corner-mark-br" />
    </>
  );
}

export default function Home() {
  const aiSelection = useAiProvider();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CoverImage[]>([]);
  const [failures, setFailures] = useState<CoverFailure[]>([]);
  const [phoneModel, setPhoneModel] =
    useState<PhoneModelId>(DEFAULT_PHONE_MODEL);
  // This studio replaces covers in the four supplied scenes; it never redraws
  // the model, hands or background. Image-model/quality selection stays separate.
  const renderMode: CoverRenderMode = "template";
  const selectedModel = getPhoneModel(phoneModel)!;
  const [pendingViews, setPendingViews] = useState<CoverView[]>([]);
  const [selectedViews, setSelectedViews] = useState<CoverView[]>([
    "hand-closeup",
  ]);
  const activeTemplates = TEMPLATE_SET.filter((template) =>
    selectedViews.includes(template.id),
  );
  const [error, setError] = useState("");
  const verifiedResults = results.filter((image) => image.verified);
  const reviewCount = results.length - verifiedResults.length;

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const chooseFile = (nextFile?: File) => {
    if (isLoading) return;
    if (!nextFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setError(
        "That image is larger than 10 MB. Please upload a smaller file.",
      );
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setFile(nextFile);
    setError("");
    setResults([]);
    setFailures([]);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  };

  const removeFile = () => {
    if (isLoading) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setPreviewUrl("");
    setFile(null);
    setResults([]);
    setFailures([]);
    setError("");
  };

  const generate = async (
    views: CoverView[] = activeTemplates.map((template) => template.id),
  ) => {
    if (isLoading) return;
    if (!views.length) {
      setError("Tick at least one image reference to generate.");
      return;
    }
    if (!aiSelection.ready) {
      setError("Choose a configured AI provider before generating.");
      return;
    }
    if (!file) {
      inputRef.current?.click();
      return;
    }
    setIsLoading(true);
    setPendingViews(views);
    setError("");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("customPrompt", customPrompt);
    formData.append("provider", aiSelection.provider);
    formData.append("qualityTier", aiSelection.qualityTier);
    formData.append("renderMode", renderMode);
    formData.append("views", JSON.stringify(views));
    formData.append("phoneModel", phoneModel);
    const previousReview =
      views.length === 1
        ? results.find(
            (image) =>
              image.templateId === views[0] &&
              image.review?.status === "mismatch",
          )?.review
        : undefined;
    if (previousReview)
      formData.append(
        "correction",
        previousReview.issues.join(" ").slice(0, 500),
      );

    try {
      const response = await fetch("/api/tools/image-generator/generate", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        images?: CoverImage[];
        failures?: CoverFailure[];
        complete?: boolean;
        error?: string;
      };
      if (!Array.isArray(payload.images) || !Array.isArray(payload.failures))
        throw new Error(
          payload.error ||
            "The requested images were not returned. Please try again.",
        );
      const accountedViews = [
        ...(payload.images ?? []).map((image) => image.templateId),
        ...(payload.failures ?? []).map((failure) => failure.viewId),
      ];
      if (
        new Set(accountedViews).size !== views.length ||
        accountedViews.length !== views.length ||
        !accountedViews.every((id) => views.some((view) => view === id)) ||
        !payload.images.every(
          (image) =>
            image.phoneModelId === phoneModel &&
            image.dataUrl?.startsWith("data:image/png;base64,") &&
            (!image.qualityTier ||
              image.qualityTier === aiSelection.qualityTier) &&
            (!image.renderMode || image.renderMode === renderMode) &&
            (image.verified === true
              ? !image.review || image.review.status === "passed"
              : image.verified === false &&
                image.review &&
                ["mismatch", "needs-review", "unavailable"].includes(
                  image.review.status,
                ) &&
                Array.isArray(image.review.issues)),
        )
      ) {
        throw new Error(
          payload.error ||
            "The requested images were not returned. Please try again.",
        );
      }
      setFailures((previous) => [
        ...previous.filter((failure) => !views.includes(failure.viewId)),
        ...payload.failures!,
      ]);
      setResults((previous) =>
        [
          ...previous.filter(
            (image) =>
              !payload.images!.some(
                (next) => next.templateId === image.templateId,
              ),
          ),
          ...payload.images!,
        ].sort(
          (a, b) =>
            TEMPLATE_SET.findIndex((item) => item.id === a.templateId) -
            TEMPLATE_SET.findIndex((item) => item.id === b.templateId),
        ),
      );
      if (payload.failures.length)
        setError(
          payload.error ||
            payload.failures
              .map((failure) => `${failure.label}: ${failure.message}`)
              .join(" "),
        );
      window.setTimeout(
        () =>
          document
            .getElementById("results")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="workspace-page">
      <div className="workspace-heading">
        <div>
          <h1>Image Generator</h1>
          <p>Upload your cover and configure the selected views.</p>
        </div>
        <span className="workspace-pill">
          {activeTemplates.length} / 4 views
        </span>
      </div>
      <section className="studio-shell" aria-label="AI product image studio">
        <div className="studio-grid">
          <div className="upload-column">
            <input
              ref={inputRef}
              aria-label="Upload phone-cover photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
              hidden
            />
            {previewUrl ? (
              <div className="uploaded-preview">
                <CornerMarks />
                <Image
                  src={previewUrl}
                  alt="Uploaded product"
                  fill
                  sizes="(max-width: 760px) 90vw, 44vw"
                  unoptimized
                />
                <button
                  className="remove-image"
                  type="button"
                  onClick={removeFile}
                  disabled={isLoading}
                  aria-label="Remove image"
                >
                  <CloseIcon />
                </button>
                <span className="image-ready">
                  <CheckIcon /> Product ready
                </span>
              </div>
            ) : (
              <div
                className={`upload-dropzone ${isDragging ? "is-dragging" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    inputRef.current?.click();
                }}
              >
                <CornerMarks />
                <span className="upload-icon">
                  <UploadIcon />
                </span>
                <h2>Upload phone cover</h2>
                <p>Drop an image or browse files</p>
                <span className="file-note">JPG, PNG or WebP · Max 10 MB</span>
              </div>
            )}
            <AiProviderSelector selection={aiSelection} disabled={isLoading} />
          </div>

          <div className="controls-column">
            <div className="control-heading">
              <div>
                <h2>Generation settings</h2>
              </div>
              <span className="ai-badge">
                <CheckIcon /> Template locked
              </span>
            </div>
            <fieldset
              className="template-picker"
              disabled={isLoading}
              aria-describedby="layout-selection-help"
            >
              <legend>Choose references to generate</legend>
              <div className="template-selection-actions">
                <span role="status">
                  {activeTemplates.length} of 4 selected
                </span>
                <div>
                  <button
                    type="button"
                    disabled={activeTemplates.length === TEMPLATE_SET.length}
                    onClick={() =>
                      setSelectedViews(
                        TEMPLATE_SET.map((template) => template.id),
                      )
                    }
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    disabled={!activeTemplates.length}
                    onClick={() => setSelectedViews([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="template-grid">
                {TEMPLATE_SET.map((item, index) => (
                  <label
                    className={`template-card template-option ${selectedViews.includes(item.id) ? "is-selected" : ""}`}
                    key={item.id}
                  >
                    <span>
                      <strong>
                        {index + 1}. {item.label}
                      </strong>
                      <small>{item.detail}</small>
                    </span>
                    <input
                      type="checkbox"
                      name="references"
                      value={item.id}
                      aria-label={item.label}
                      checked={selectedViews.includes(item.id)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedViews((previous) =>
                          checked
                            ? [...previous, item.id]
                            : previous.filter((id) => id !== item.id),
                        );
                      }}
                    />
                  </label>
                ))}
              </div>
              <p id="layout-selection-help">
                {activeTemplates.length
                  ? "Only checked views use generation credits."
                  : "Select at least one view."}
              </p>
            </fieldset>

            <PhoneModelSelector
              value={phoneModel}
              disabled={isLoading}
              onChange={(next) => {
                setPhoneModel(next);
                setResults([]);
                setFailures([]);
                setError("");
              }}
            />

            <details className="workspace-details">
              <summary>Product notes (optional)</summary>
              <label className="prompt-field">
                <span>
                  Product notes <small>Optional</small>
                </span>
                <textarea
                  value={customPrompt}
                  onChange={(event) =>
                    setCustomPrompt(event.target.value.slice(0, 400))
                  }
                  placeholder="e.g. preserve the metallic edge and exact camera cutout…"
                  rows={2}
                />
                <i>{customPrompt.length}/400</i>
              </label>
            </details>

            <fieldset
              className="ai-provider-selector"
              disabled={isLoading}
              aria-describedby="render-mode-help"
            >
              <legend>Rendering</legend>
              <input type="hidden" name="renderMode" value="template" />
              <strong>Exact template · cover replacement</strong>
              <p id="render-mode-help" className="ai-provider-help">
                Uses your four selected reference layouts. Original scene,
                framing, hands and background stay fixed. Only the phone-cover
                area and selected camera hardware are replaced.
              </p>
            </fieldset>
            <details className="workspace-details">
              <summary>Generation & review details</summary>
              <p>
                Product input: up to{" "}
                {aiSelection.provider === "gemini" &&
                aiSelection.qualityTier === "quality"
                  ? "1536"
                  : "1024"}
                px. One analysis per request and a paid review per result.
                Flagged images remain drafts. No automatic redraws or upgrades.
                New settings apply to the next generation.
              </p>
            </details>
            <button
              className="generate-button"
              type="button"
              onClick={() => void generate()}
              disabled={
                isLoading || !aiSelection.ready || !activeTemplates.length
              }
            >
              {isLoading ? <span className="spinner" /> : <SparklesIcon />}
              {isLoading
                ? `Creating & checking ${pendingViews.length} ${pendingViews.length === 1 ? "image" : "images"}…`
                : activeTemplates.length
                  ? `Generate ${activeTemplates.length} selected ${activeTemplates.length === 1 ? "image" : "images"}`
                  : "Select at least 1 reference"}
              {!isLoading && <ArrowIcon />}
            </button>
          </div>
        </div>
      </section>
      {error && (
        <div className="error-banner" role="alert">
          <span>!</span>
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <CloseIcon />
          </button>
        </div>
      )}

      {(isLoading || results.length > 0 || failures.length > 0) && (
        <section id="results" className="results-section">
          <div className="section-heading results-heading">
            <div>
              <h2>{isLoading ? "Generating…" : "Results"}</h2>
            </div>
            {results.length > 0 && (
              <button
                type="button"
                className="text-button"
                disabled={isLoading || !activeTemplates.length}
                onClick={() => void generate()}
              >
                <SparklesIcon /> Generate selected views again
              </button>
            )}
          </div>
          {!isLoading && reviewCount > 0 && (
            <div className="cover-review-notice" role="status">
              <strong>
                {reviewCount}{" "}
                {reviewCount === 1 ? "image needs" : "images need"} your
                review—not a generation failure.
              </strong>
              <p>
                Your generated images are kept below. AI checks can misread
                small details; inspect the artwork and cameras. Drafts are not
                included in background/ZIP exports.
              </p>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  Open your raw upload for comparison
                </a>
              )}
            </div>
          )}
          <div className="results-grid">
            {isLoading
              ? TEMPLATE_SET.filter((template) =>
                  pendingViews.includes(template.id),
                ).map((template) => (
                  <div className="result-skeleton" key={template.src}>
                    <span className="skeleton-glow" />
                    <span className="loading-mark">
                      <SparklesIcon />
                    </span>
                    <p>Creating {template.label.toLowerCase()}</p>
                  </div>
                ))
              : results.map((result, index) => (
                  <article className="result-card" key={result.id}>
                    <div className="result-image">
                      <Image
                        src={result.dataUrl}
                        alt={`Generated product visual ${index + 1}`}
                        fill
                        sizes="(max-width: 760px) 92vw, 30vw"
                        unoptimized
                      />
                      <span className="result-number">0{index + 1}</span>
                    </div>
                    <div className="result-footer">
                      <span>
                        <strong>{result.label}</strong>
                        <small>
                          Requested:{" "}
                          {result.phoneModelLabel ?? selectedModel.label} ·{" "}
                          {result.rearCameras ?? selectedModel.rearCameras} rear
                          cameras
                        </small>
                        <small>
                          {result.verified
                            ? "AI check passed · inspect before publishing"
                            : result.review?.status === "unavailable"
                              ? "Draft · AI check unavailable"
                              : result.review?.status === "mismatch"
                                ? "Draft · AI flagged a possible mismatch"
                                : "Draft · visual review needed"}
                        </small>
                      </span>
                      <a
                        href={result.dataUrl}
                        download={`margyn-${phoneModel}-${result.templateId}${result.verified ? "" : "-draft"}.${result.mimeType.includes("jpeg") ? "jpg" : "png"}`}
                        aria-label={`Download ${result.verified ? "" : "draft: "}${result.label}`}
                      >
                        <DownloadIcon />
                      </a>
                    </div>
                    {!result.verified && (
                      <div className="cover-review-details">
                        <strong>
                          {result.review?.status === "unavailable"
                            ? "The image was generated, but its check did not finish."
                            : "Inspect this draft before publishing."}
                        </strong>
                        <ul>
                          {result.review?.issues.map((issue, issueIndex) => (
                            <li key={issueIndex}>{issue}</li>
                          ))}
                        </ul>
                        <p>
                          A new generation uses credits. You can keep this draft
                          or regenerate just this view.
                        </p>
                        <button
                          className="app-button"
                          type="button"
                          disabled={isLoading || !aiSelection.ready}
                          onClick={() =>
                            void generate([result.templateId as CoverView])
                          }
                        >
                          Regenerate this view (uses credits)
                        </button>
                      </div>
                    )}
                    <ImageEnhancer
                      source={result.dataUrl}
                      name={`margyn-${result.templateId}`}
                    />
                    <div className="result-generation-settings">
                      <small>
                        {result.imageModel ?? "Previous generation"} ·{" "}
                        {result.imageModel === "gpt-image-2.5-flare" &&
                        result.qualityTier === "quality"
                          ? "Low quality"
                          : result.qualityTier === "quality"
                            ? "High quality"
                            : "Economy"}{" "}
                        ·{" "}
                        {result.renderMode === "full-ai"
                          ? "New AI scene"
                          : "Exact reference · phone only"}
                      </small>
                      {result.verified && (
                        <button
                          className="app-button"
                          type="button"
                          disabled={isLoading || !aiSelection.ready}
                          onClick={() =>
                            void generate([result.templateId as CoverView])
                          }
                        >
                          Regenerate this view (uses credits)
                        </button>
                      )}
                    </div>
                  </article>
                ))}
          </div>
          {failures.map((failure) => (
            <div
              key={failure.viewId}
              className="charm-retry-view"
              role="status"
            >
              <div>
                <strong>{failure.label} needs another attempt</strong>
                <p>{failure.message}</p>
              </div>
              <button
                className="app-button"
                type="button"
                disabled={isLoading || !aiSelection.ready}
                onClick={() => void generate([failure.viewId])}
              >
                {isLoading && pendingViews.includes(failure.viewId)
                  ? "Creating & checking…"
                  : "Retry only this view"}
              </button>
            </div>
          ))}
        </section>
      )}

      {verifiedResults.some(
        (image) =>
          image.templateId === "hand-closeup" &&
          image.backgroundReady !== false,
      ) && (
        <BackgroundBatchStudio
          key={verifiedResults[0].id}
          generatedImages={verifiedResults}
        />
      )}

      {!isLoading && !results.length && !failures.length && (
        <div className="workspace-empty">
          Generated images will appear here.
        </div>
      )}
    </main>
  );
}
