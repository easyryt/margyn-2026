"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ImageEnhancer from "../components/image-enhancer";

export default function EnhancePage() {
  const [file, setFile] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const objectUrl = useRef("");
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  function choose(next?: File) {
    if (!next) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type) || !next.size || next.size > 10 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image up to 10 MB.");
      return;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(next);
    setFile({ name: next.name, url: objectUrl.current });
    setError("");
  }
  return <main className="workspace-page">
    <div className="workspace-heading"><div><h1>Image enhancer</h1><p>Adjust detail, lighting and export size.</p></div><span className="workspace-pill">Local · no AI credits</span></div>
    <section className="local-enhance-page">
      <label className="local-upload-label" htmlFor="enhance-upload">Choose an image · JPG, PNG or WebP · up to 10 MB / 16 MP</label>
      <input id="enhance-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
      {error && <p role="alert">{error}</p>}
      {file && <><p>Selected: {file.name}</p><article className="result-card local-enhance-card"><div className="enhancement-preview checkerboard"><Image src={file.url} alt={`Original ${file.name}`} width={1080} height={1080} unoptimized /></div><ImageEnhancer source={file.url} name={file.name.replace(/\.[^.]+$/, "")} expanded /></article></>}
      <details className="workspace-details"><summary>Tool limits</summary><p>Browser-only processing. Enhancement cannot correct artwork, reconnect a charm or recover missing detail. Compare before publishing.</p></details>
    </section>
  </main>;
}
