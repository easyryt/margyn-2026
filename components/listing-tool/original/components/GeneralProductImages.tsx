"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { ImageOff, ImagePlus, Maximize2, X } from "lucide-react";
import type { GeneralProductListing } from "@/components/listing-tool/original/lib/general-product-excel";
import { GENERAL_PRODUCT_IMAGE_FIELDS, generalProductImageSource, type GeneralProductImageField } from "@/components/listing-tool/original/lib/general-product-review";
import GeneralProductDialog from "./GeneralProductDialog";
import MeeshoImageUpload from "./MeeshoImageUpload";
import MeeshoImageSetUpload from "./MeeshoImageSetUpload";
import type { MeeshoTarget } from "@/components/listing-tool/original/lib/meesho-upload-contract";

export function GeneralProductImagePreview({ value, label, className = "h-36 w-full", compact = false }: {
  value: string;
  label: string;
  className?: string;
  compact?: boolean;
}) {
  const source = generalProductImageSource(value);
  const [failedSource, setFailedSource] = useState("");
  const [enlarged, setEnlarged] = useState(false);
  const unavailable = !!source && failedSource === source;
  const canPreview = !!source && !unavailable;

  return (
    <>
      <button type="button" aria-label={`${unavailable ? "Retry" : "Preview"} ${label}`} title={unavailable ? "Retry loading image" : canPreview ? "Click to enlarge image" : "Add a working image link to preview"} disabled={!source} onClick={() => unavailable ? setFailedSource("") : setEnlarged(true)} className={`group relative flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:cursor-default ${className}`}>
        {canPreview ? <>
          <Image key={source} src={source} alt={label} width={480} height={480} unoptimized loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSource(source)} className="h-full w-full object-contain" />
          <span className="absolute bottom-2 right-2 rounded-lg bg-white/95 p-1.5 text-slate-600 shadow-sm group-hover:text-violet-700"><Maximize2 size={compact ? 12 : 15} /></span>
        </> : <span className={`flex flex-col items-center gap-2 px-2 text-center text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>
          {unavailable ? <ImageOff size={compact ? 18 : 26} /> : <ImagePlus size={compact ? 18 : 26} />}
          {compact ? (unavailable ? "Retry image" : "No image") : (unavailable ? "Image unavailable — click to retry" : value.trim() ? "Paste a valid image URL" : "Image preview will appear here")}
        </span>}
      </button>
      {enlarged && source && <GeneralProductDialog title="Image preview" description={label} onClose={() => setEnlarged(false)}>
        <Image src={source} alt={label} width={1200} height={1200} unoptimized referrerPolicy="no-referrer" className="max-h-[65dvh] w-full object-contain" />
      </GeneralProductDialog>}
    </>
  );
}

export function GeneralProductImageUrlField({ label, inputLabel = label, value, onChange, disabled = false, primary = false, compact = false, target }: {
  target: MeeshoTarget;
  label: string;
  inputLabel?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  primary?: boolean;
  compact?: boolean;
}) {
  const hintId = useId();
  const invalid = !!value.trim() && (!generalProductImageSource(value) || !value.trim().toLowerCase().startsWith("https://"));
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${primary ? "border-violet-200 bg-violet-50/40" : "border-slate-200 bg-white"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-700">{primary ? "Front image" : label.replace(/ URL$/, "")}</p>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${primary ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>{primary ? "Required" : "Optional"}</span>
      </div>
      <GeneralProductImagePreview value={value} label={`${inputLabel} preview`} className={compact ? "h-24 w-full" : "h-40 w-full"} compact={compact} />
      <label className="mt-3 block">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <div className="relative mt-1.5">
          <input type="url" value={value} disabled={disabled} aria-label={inputLabel} aria-describedby={hintId} aria-invalid={invalid || undefined} spellCheck={false} autoComplete="off" placeholder="https://…/product-image.jpg" onChange={(event) => onChange(event.target.value)} className={`h-10 w-full min-w-0 rounded-lg border bg-white pl-3 pr-9 text-xs text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 ${invalid ? "border-rose-300" : "border-slate-200"}`} />
          {!!value && <button type="button" disabled={disabled} aria-label={`Clear ${inputLabel}`} onClick={() => onChange("")} className="absolute right-1 top-1 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={14} /></button>}
        </div>
      </label>
      <p id={hintId} className={`mt-2 text-[11px] leading-4 ${invalid ? "text-rose-600" : "text-slate-500"}`}>{invalid ? "Use a full HTTPS image link for export." : "Paste a link to update the preview. Click the image to enlarge."}</p>
      <MeeshoImageUpload target={target} value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function GeneralProductImages({ listing, rowId, onChange, disabled = false, fields = GENERAL_PRODUCT_IMAGE_FIELDS }: {
  rowId: string;
  listing: Pick<GeneralProductListing, GeneralProductImageField>;
  onChange: (field: GeneralProductImageField, value: string) => void;
  disabled?: boolean;
  fields?: readonly GeneralProductImageField[];
}) {
  return <>
    {fields.length === 4 && <MeeshoImageSetUpload rowId={rowId} values={listing} onChange={onChange} disabled={disabled} />}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {fields.map((field) => <GeneralProductImageUrlField key={field} target={{ rowId, field }} label={`Image ${field.slice(-1)} URL`} primary={field === "image1"} value={listing[field]} disabled={disabled} onChange={(value) => onChange(field, value)} />)}
    </div>
  </>;
}
