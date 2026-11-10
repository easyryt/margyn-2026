"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, LoaderCircle, X } from "lucide-react";
import { generalProductBatchError, generalProductBatchRows, generalProductExportCategoryError } from "@/components/listing-tool/original/lib/general-product-batch";
import { categoryListingRows, loadCategoryProducts, type GeneralProductCatalogResponse } from "@/components/listing-tool/original/lib/general-product-catalog";
import { generalProductsRequest, type SavedGeneralProduct } from "@/components/listing-tool/original/lib/general-products-api";
import type { GeneralProductListing } from "@/components/listing-tool/original/lib/general-product-excel";

export type GeneralProductExportTarget = { category: string; product?: SavedGeneralProduct; rows?: GeneralProductListing[] };

export default function GeneralProductExportDialog({ target, onClose }: { target: GeneralProductExportTarget; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const scope = target.rows ? "selection" : target.product ? "product" : "category";
  const categories = target.rows ? [...new Set(target.rows.map((row) => row.category))] : target.product ? [...new Set(generalProductBatchRows(target.product).map((row) => row.category))] : [target.category];
  const [category, setCategory] = useState(target.category);
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function exportListings() {
    setError(""); setBusy(true); setProgress("Loading saved listings…");
    try {
      const products = target.rows ? [] : target.product ? [target.product] : await loadCategoryProducts(category,
        (path) => generalProductsRequest<GeneralProductCatalogResponse>(path),
        (loaded, total) => setProgress(`Loading products: ${loaded} of ${total}`));
      const rows = target.rows ? target.rows.filter((row) => row.category.trim() === category.trim()) : categoryListingRows(products, category);
      const validationError = generalProductBatchError(rows) || generalProductExportCategoryError(rows);
      if (validationError) throw new Error(validationError);
      setProgress(`Preparing ${rows.length} listing rows…`);
      const { exportGeneralProductExcel } = await import("@/components/listing-tool/original/lib/general-product-excel");
      const name = category.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "general-products";
      await exportGeneralProductExcel(rows, `${name}-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      onClose();
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : "Unable to export saved listings."); }
    finally { setBusy(false); setProgress(""); }
  }

  return <dialog ref={dialog} aria-labelledby="general-export-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
    <div className="flex items-start justify-between border-b border-slate-100 p-6"><div><div className="mb-3 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-700"><FileSpreadsheet size={22} /></div><h2 id="general-export-title" className="text-xl font-bold">Export {scope}</h2><p className="mt-1 text-sm text-slate-500">Download your listings in the shared Meesho workbook.</p></div><button aria-label="Close export" disabled={busy} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={20} /></button></div>
    <div className="space-y-4 p-6">
      {categories.length > 1 ? <label className="block text-sm font-semibold">Category<select value={category} onChange={(event) => { setCategory(event.target.value); setError(""); }} disabled={busy} className="mt-2 block w-full rounded-lg border border-slate-200 p-3">{categories.map((name) => <option key={name}>{name}</option>)}</select></label> : <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p><p className="mt-1 font-semibold">{category}</p></div>}
      <p className="text-sm leading-6 text-slate-600">{target.rows ? `Includes only your ${target.rows.length} selected saved listing row${target.rows.length === 1 ? "" : "s"}. Unselected parents and variants are not exported.` : target.product ? "Includes this product’s parent and variant rows in the selected category." : "Includes every saved parent and variant row in this category, across all pages. Table search does not limit this export."}</p>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-900">meesho-template.xlsx</p><p className="mt-1 text-xs leading-5 text-emerald-800">Used automatically, just like phone listings. No file upload needed.</p></div>
      <p className="text-xs leading-5 text-slate-500">Matching fields are filled without changing the original workbook. Its Mobile Cases &amp; Covers heading and dropdowns are retained.</p>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{busy && <p role="status" className="flex items-center gap-2 text-sm text-violet-700"><LoaderCircle size={16} className="animate-spin" />{progress}</p>}
    </div>
    <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-5"><button onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40">Cancel</button><button onClick={() => void exportListings()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"><Download size={16} />{busy ? "Preparing…" : "Download Excel"}</button></div>
  </dialog>;
}
