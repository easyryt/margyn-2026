"use client";

import ToolTips from "@/components/tool-tips";
import { useId } from "react";

export default function GenerationScope<T extends string>({ views, value, onChange, disabled }: {
  views: readonly { id: T; label: string }[];
  value: T | "all";
  onChange: (value: T | "all") => void;
  disabled?: boolean;
}) {
  const id = useId();
  return <div className="generation-scope">
    <div className="tool-tip-line">
      <label htmlFor={id}>Image views</label>
      <ToolTips label="image views" tips={["Choose a single view if you only need one angle. Choose all views to generate the full set."]} />
    </div>
    <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as T | "all")}>
      {views.map((view) => <option key={view.id} value={view.id}>{view.label} · 1 image</option>)}
      <option value="all">All {views.length} views · {views.length} images</option>
    </select>
    <p>Generation and review use AI credits for each selected view.</p>
  </div>;
}
