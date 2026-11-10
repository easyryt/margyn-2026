"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Database, LoaderCircle } from "lucide-react";
import MeeshoVariantImagesUpload from "./MeeshoVariantImagesUpload";
import type { VariantImageRow } from "@/components/listing-tool/original/lib/meesho-variant-images";
import { getMeeshoUpload, getMeeshoUploadRevision, subscribeMeesho } from "@/components/listing-tool/original/lib/meesho-upload-client";
import { pendingVariantMainImageChanges, saveVariantMainImages, type PendingVariantMainImages } from "@/components/listing-tool/original/lib/saved-variant-images";

export default function SavedVariantImagesUpload({ productId, variants, onSave, disabled = false }: {
  productId: string;
  variants: VariantImageRow[];
  onSave: (rowId: string, payload: { image1: string }) => Promise<void>;
  disabled?: boolean;
}) {
  useSyncExternalStore(subscribeMeesho, getMeeshoUploadRevision, () => 0);
  const [pending, setPending] = useState<PendingVariantMainImages>({});
  const [reset, setReset] = useState(0);
  const [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const saveLock = useRef(false);
  const rows = variants.map(row => pending[row.rowId] ? { ...row, image1: pending[row.rowId].url } : row);
  const uploading = variants.some(row => ["queued", "running", "ready"].includes(getMeeshoUpload({ rowId: row.rowId, field: "image1" })?.phase || ""));
  const changed = Object.entries(pending).filter(([id, change]) => variants.find(row => row.rowId === id)?.image1 !== change.url).length;
  const save = async () => {
    if (disabled || uploading || saveLock.current || !changed) return;
    saveLock.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const plan = pendingVariantMainImageChanges(variants, pending);
      const result = await saveVariantMainImages(plan, onSave);
      setPending(current => Object.fromEntries(Object.entries(current).filter(([id, change]) =>
        !result.saved.includes(id) || plan.find(row => row.rowId === id)?.payload.image1 !== change.url)));
      if (result.saved.length) setMessage(`${result.saved.length} variant main image${result.saved.length === 1 ? "" : "s"} saved to the database.`);
      if (result.errors.length) setError(`${result.errors.length} could not be saved. Their links are kept for retry. ${result.errors[0]}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save main images."); }
    finally { saveLock.current = false; setSaving(false); }
  };
  if (!variants.length) return null;
  return <div data-saved-variant-images={productId}>
    <MeeshoVariantImagesUpload key={reset} productId={productId} variants={rows} disabled={disabled || saving}
      saveHint="When the uploads finish, click Save main images below to store the new links in the database."
      onChange={(rowId, url) => {
        const row = variants.find(value => value.rowId === rowId);
        if (!row) return;
        setPending(current => ({ ...current, [rowId]: { url, initialValue: current[rowId]?.initialValue ?? row.image1 } }));
        setMessage("");
      }} />
    {!!changed && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs text-amber-900">{changed} uploaded main-image link{changed === 1 ? " is" : "s are"} ready to save. Supporting images stay unchanged.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={disabled || saving || uploading} onClick={() => { setPending({}); setReset(current => current + 1); setError(""); setMessage("Unsaved image links discarded. Your saved images are unchanged."); }} className="text-xs font-semibold text-slate-600 disabled:opacity-50">Discard unsaved links</button>
        <button type="button" onClick={() => void save()} disabled={disabled || saving || uploading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
          {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Database size={14} />}
          {saving ? "Saving main images…" : `Save ${changed} main image${changed === 1 ? "" : "s"} to database`}
        </button>
      </div>
    </div>}
    {message && <p role="status" className="mb-4 text-xs font-semibold text-emerald-700">{message}</p>}
    {error && <p role="alert" className="mb-4 text-xs text-rose-600">{error}</p>}
  </div>;
}
