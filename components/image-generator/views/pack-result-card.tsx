"use client";

import Image from "next/image";
import { useState } from "react";
import { packQuantityLabel, type PackViewId } from "@/lib/image-generator/charm-pack-options";
import { createTaggedPackImage } from "@/lib/image-generator/charm-pack-tag";
import ImageEnhancer from "../components/image-enhancer";

export type PackImage = { id: string; templateId: PackViewId; label: string; quantity: number; dataUrl: string };

export default function PackResultCard({ image }: { image: PackImage }) {
  const [taggedUrl, setTaggedUrl] = useState("");
  const [showTag, setShowTag] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [error, setError] = useState("");
  const displayedUrl = showTag && taggedUrl ? taggedUrl : image.dataUrl;

  async function toggleTag() {
    if (tagging) return;
    setError("");
    if (showTag) { setShowTag(false); return; }
    if (taggedUrl) { setShowTag(true); return; }
    setTagging(true);
    try {
      setTaggedUrl(await createTaggedPackImage(image.dataUrl, image.quantity));
      setShowTag(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add the tag. Your original image is unchanged.");
    } finally { setTagging(false); }
  }

  return (
    <article className="result-card" aria-label={image.label}>
      <div className="result-image"><Image src={displayedUrl} alt={`${image.label}, ${packQuantityLabel(image.quantity)}, ${showTag ? "with quantity tag" : "no tag"}`} fill sizes="(max-width: 680px) 92vw, 46vw" unoptimized /></div>
      <div className="result-footer"><span><strong>{image.label}</strong><small>{packQuantityLabel(image.quantity)} · {showTag ? "With tag" : "No tag"} · 1080 × 1080 PNG</small></span><a href={displayedUrl} download={`margyn-${image.templateId}-${image.quantity}-pcs-${showTag ? "tagged" : "no-tag"}.png`} aria-label={`Download ${image.label}${showTag ? " with tag" : " without tag"}`}>↓</a></div>
      <div className="pack-result-tools">
        <button type="button" className="app-button" disabled={tagging} aria-pressed={showTag} onClick={() => void toggleTag()}>{tagging ? "Adding tag…" : showTag ? "Remove tag" : `Add ${packQuantityLabel(image.quantity)} tag`}</button>
        <p role="status">{showTag ? "Tag added. The download includes it." : "Original image. Add a tag anytime—no AI credits needed."}</p>
        {error && <p className="pack-tag-error" role="alert">{error}</p>}
      </div>
      <ImageEnhancer source={displayedUrl} name={`margyn-${image.templateId}-${image.quantity}-pcs-${showTag ? "tagged" : "no-tag"}`} />
    </article>
  );
}
