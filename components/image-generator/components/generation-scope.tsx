"use client";

import { useId } from "react";

export default function GenerationScope<T extends string>({ views, value, onChange, disabled }: {
  views: readonly { id: T; label: string }[];
  value: T | "all";
  onChange: (value: T | "all") => void;
  disabled?: boolean;
}) {
  const id = useId();
  return <div className="generation-scope">
    <label htmlFor={id}>Image views</label>
    <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as T | "all")}>
      {views.map((view) => <option key={view.id} value={view.id}>{view.label} · 1 image</option>)}
      <option value="all">All {views.length} views · {views.length} images</option>
    </select>
    <p>Generation and review use AI credits for each selected view.</p>
  </div>;
}
