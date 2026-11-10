"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, Check, Images, LoaderCircle, X } from "lucide-react";
import UploadedImagePreview from "./UploadedImagePreview";
import { canApplyMeeshoReceipt, type MeeshoImageField } from "@/components/listing-tool/original/lib/meesho-upload-contract";
import { arrangeProductImages, imageSetProgress, PRODUCT_IMAGE_SLOTS, validateProductImageFiles, type ProductImageSetJob, type ProductImageValues } from "@/components/listing-tool/original/lib/meesho-image-set";
import { getMeeshoUpload, getMeeshoUploadRevision, markMeeshoApplied, resumeMeeshoUpload, startMeeshoImageSet, startMeeshoUpload, subscribeMeesho } from "@/components/listing-tool/original/lib/meesho-upload-client";

function FilePreview({ file }: { file: File }) {
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const url = URL.createObjectURL(file); node.style.backgroundImage = `url("${url}")`;
    return () => { URL.revokeObjectURL(url); };
  }, [file]);
  return <div ref={attach} role="img" aria-label={`Selected ${file.name} preview`} className="h-28 w-full rounded-lg bg-white bg-contain bg-center bg-no-repeat" />;
}
export default function MeeshoImageSetUpload({ rowId, values, onChange, disabled = false, compact = false }: {
  rowId: string; values: ProductImageValues; onChange: (field: MeeshoImageField, url: string) => void; disabled?: boolean; compact?: boolean;
}) {
  const revision = useSyncExternalStore(subscribeMeesho, getMeeshoUploadRevision, () => 0);
  const [selection, setSelection] = useState<{ rowId: string; slots: Array<File | null> } | null>(null);
  const [batch, setBatch] = useState<{ rowId: string; jobs: ProductImageSetJob[] } | null>(null);
  const [error, setError] = useState("");
  const picker = useRef<HTMLInputElement>(null), applying = useRef(new Set<string>());
  const slots = selection?.rowId === rowId ? selection.slots : null;
  const jobs = batch?.rowId === rowId ? batch.jobs : [];
  const selectedCount = slots?.filter(Boolean).length || 0;
  const readJob = (entry: ProductImageSetJob) => getMeeshoUpload({ rowId, field: entry.field });
  const summary = imageSetProgress(jobs, readJob, values);
  const active = jobs.some(entry => { const job = readJob(entry); return job?.id === entry.id && ["queued", "running"].includes(job.phase); });
  useEffect(() => {
    if (!batch || batch.rowId !== rowId || disabled) return;
    for (const expected of batch.jobs) {
      const target = { rowId, field: expected.field }, job = getMeeshoUpload(target);
      if (!job || job.id !== expected.id || job.phase !== "ready" || !job.receipt) continue;
      if ((job.superseded && values[expected.field] !== job.receipt.url) || !canApplyMeeshoReceipt(job.receipt, job, values[expected.field], job.initialValue)) continue;
      if (values[expected.field] === job.receipt.url) markMeeshoApplied(target, job.id);
      else if (!applying.current.has(job.id)) { applying.current.add(job.id); onChange(expected.field, job.receipt.url); }
    }
  }, [batch, rowId, values, onChange, disabled, revision]);
  const choose = (files: File[]) => {
    try { validateProductImageFiles(files); const ordered = arrangeProductImages(files); setSelection({ rowId, slots: ordered }); setBatch(null); setError(""); applying.current.clear(); }
    catch (e) { setError(e instanceof Error ? e.message : "Choose up to four product images."); }
  };
  const swap = (from: number, to: number) => { if (!slots || to < 0 || to > 3) return; const next = [...slots]; [next[from], next[to]] = [next[to], next[from]]; setSelection({ rowId, slots: next }); };
  const start = () => {
    if (!slots || disabled || active) return;
    try {
      const selections = slots.flatMap((file, index) => file ? [{ field: PRODUCT_IMAGE_SLOTS[index], file }] : []);
      const ticket = startMeeshoImageSet(rowId, selections, values);
      setBatch({ rowId, jobs: ticket.jobs }); setError("");
      void ticket.finished.catch(e => setError(e instanceof Error ? e.message : "Check the individual image results."));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not queue this image set."); }
  };
  const reupload = (field: MeeshoImageField, file: File) => {
    if (disabled || active) return;
    try {
      const operation = startMeeshoUpload(file, { rowId, field }, values[field]);
      const job = getMeeshoUpload({ rowId, field }); if (!job) return;
      setBatch(current => current?.rowId === rowId ? { ...current, jobs: current.jobs.map(entry => entry.field === field ? { id: job.id, field, name: file.name } : entry) } : current);
      void operation.catch(e => setError(e instanceof Error ? e.message : "Check this image's result."));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not re-upload this selected image."); }
  };
  return <div data-meesho-image-set={rowId} className={`my-3 rounded-xl border border-violet-200 bg-violet-50/40 ${compact ? "p-2" : "p-4"}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="flex items-center gap-2 text-xs font-bold text-slate-800"><Images size={15} />Main + supporting images</p>{!compact && <p className="mt-1 text-xs leading-5 text-slate-500">Choose up to 4 images for this product. 1.png → Main; Sup 1, Sup 2, Sup 3 → Images 2–4.</p>}</div>
      <button type="button" disabled={disabled || active} onClick={() => picker.current?.click()} aria-label={`Choose main and supporting images for ${rowId}`} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"><Images size={14} />{jobs.length ? "Choose another image set" : "Choose up to 4 images"}</button>
      <input ref={picker} type="file" multiple accept="image/png,image/jpeg" className="hidden" aria-label={`Choose bulk Meesho images for ${rowId}`} onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ""; if (files.length) choose(files); }} />
    </div>
    {slots && <>
      <div className={`mt-3 grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
        {slots.map((file, index) => {
          const field = PRODUCT_IMAGE_SLOTS[index], expected = jobs.find(j => j.field === field), job = expected ? readJob(expected) : null;
          const matches = !!expected && job?.id === expected.id, receipt = matches ? job.receipt : undefined;
          const linked = matches && job.phase === "applied" && receipt?.url === values[field];
          const conflict = matches && !!receipt && ((job.superseded && values[field] !== receipt.url) || !canApplyMeeshoReceipt(receipt, job, values[field], job.initialValue));
          return <div key={`${rowId}-${field}`} className={`min-w-0 rounded-xl border p-2.5 ${index === 0 ? "border-violet-300 bg-white" : "border-slate-200 bg-white/80"}`}>
            <p className="mb-2 text-[11px] font-bold text-slate-700">{index === 0 ? "Main image · Image 1" : `Supporting ${index} · Image ${index + 1}`}</p>
            {file ? <>{receipt ? <UploadedImagePreview url={receipt.url} name={receipt.originalName} /> : <FilePreview key={`${file.name}-${file.size}-${file.lastModified}`} file={file} />}<p className="mt-2 truncate text-xs font-semibold text-slate-700" title={file.name}>{file.name}</p>
              {!jobs.length && <div className="mt-2 flex items-center gap-1"><button type="button" disabled={index === 0 || disabled} aria-label={`Move ${file.name} earlier`} onClick={() => swap(index, index - 1)} className="rounded border p-1 text-slate-500 disabled:opacity-30"><ArrowUp size={13} /></button><button type="button" disabled={index === 3 || disabled} aria-label={`Move ${file.name} later`} onClick={() => swap(index, index + 1)} className="rounded border p-1 text-slate-500 disabled:opacity-30"><ArrowDown size={13} /></button><button type="button" disabled={disabled} aria-label={`Remove selected ${file.name}`} onClick={() => { const next = [...slots]; next[index] = null; setSelection({ rowId, slots: next }); }} className="ml-auto rounded p-1 text-slate-400"><X size={13} /></button></div>}
            </> : <p className="flex min-h-28 items-center justify-center rounded-lg border border-dashed px-2 text-center text-[11px] text-slate-400">No new image. Existing link stays.</p>}
            {matches && <div className="mt-2"><div role="progressbar" aria-label={`Bulk Image ${index + 1} progress`} aria-valuenow={linked ? 100 : Math.min(job.progress,95)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={linked ? "h-full bg-emerald-500" : "h-full bg-violet-500"} style={{width:`${linked ? 100 : Math.min(job.progress,95)}%`}} /></div><p role="status" className={`mt-2 text-[11px] leading-4 ${linked ? "text-emerald-700" : conflict || job.phase === "error" ? "text-rose-600" : "text-slate-500"}`}>{linked ? "✓ 100% · Correct image link filled" : conflict ? "Field changed; newer link preserved." : job.message}</p>
              {job.phase === "error" && job.canResume && <button type="button" disabled={disabled || active} onClick={() => void resumeMeeshoUpload({ rowId, field })} className="mt-2 text-[11px] font-semibold text-violet-700">Check this image’s saved upload</button>}
              {conflict && receipt && <button type="button" disabled={disabled} onClick={() => onChange(field,receipt.url)} className="mt-2 text-[11px] font-semibold text-violet-700">Use this uploaded image</button>}
              {linked && file && <button type="button" disabled={disabled || active} aria-label={`Re-upload selected ${file.name}`} onClick={() => reupload(field,file)} className="mt-2 text-[11px] font-semibold text-slate-500 underline disabled:opacity-40">Re-upload this image</button>}
            </div>}
          </div>;
        })}
      </div>
      {!jobs.length && <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Check the order before uploading. Empty slots keep their current links. PNG/JPG, up to 4 MB each.</p><button type="button" disabled={disabled || !selectedCount} onClick={start} className="rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">Upload {selectedCount} image{selectedCount === 1 ? "" : "s"} to Meesho</button></div>}
    </>}
    {!!jobs.length && <div className="mt-3 rounded-lg bg-white p-3"><div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700"><span className="flex items-center gap-2">{summary.completed === jobs.length ? <Check size={14} className="text-emerald-600" /> : active ? <LoaderCircle size={14} className="animate-spin text-violet-600" /> : null}{summary.completed} of {jobs.length} image links filled</span><span>{summary.percent}%</span></div><div role="progressbar" aria-label="Product image set upload and link progress" aria-valuenow={summary.percent} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div style={{width:`${summary.percent}%`}} className={`h-full transition-[width] ${summary.completed === jobs.length ? "bg-emerald-500" : "bg-violet-500"}`} /></div><p className="mt-2 text-[11px] text-slate-500">{summary.completed === jobs.length ? "All selected images are uploaded and linked to this product in the chosen order." : "Images upload separately. Each confirmed link fills only its assigned slot; successful images are not re-uploaded by retry."}</p></div>}
    {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
  </div>;
}
