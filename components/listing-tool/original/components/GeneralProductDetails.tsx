"use client";

import Link from "@/components/listing-tool/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, ExternalLink, Layers3, LoaderCircle, Package, Pencil, Plus, Search } from "lucide-react";
import { generalProductBatchRows } from "@/components/listing-tool/original/lib/general-product-batch";
import { categoryHref, generalProductAddVariantsHref, GENERAL_PRODUCT_DETAIL_SECTIONS, listingMoney as money, listingNumber as number } from "@/components/listing-tool/original/lib/general-product-catalog";
import { generalProductsRequest, type SavedGeneralProduct } from "@/components/listing-tool/original/lib/general-products-api";
import GeneralProductExportDialog from "./GeneralProductExportDialog";

function imageHref(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : null; } catch { return null; }
}

export default function GeneralProductDetails({ productId, category = "", initialListingId = "" }: { productId: string; category?: string; initialListingId?: string }) {
  const [product, setProduct] = useState<SavedGeneralProduct | null>(null);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState(initialListingId);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    generalProductsRequest<{ product: SavedGeneralProduct }>(`/${encodeURIComponent(productId)}`, { signal: controller.signal })
      .then((result) => { if (!cancelled) { setProduct(result.product); setError(""); } })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load product."); });
    return () => { cancelled = true; controller.abort(); };
  }, [productId, loadAttempt]);

  const rows = product ? generalProductBatchRows(product) : [];
  const selected = rows.find((row) => row.id === selectedId) || rows.find((row) => row.category === category) || rows[0];
  const returnCategory = category || product?.draft.category || "";
  const backHref = returnCategory ? categoryHref(returnCategory) : "/general-products";
  const matches = rows.filter((row) => `${row.productName} ${row.sku}`.toLowerCase().includes(search.trim().toLowerCase()));
  const stock = rows.reduce((sum, row) => sum + Number(row.inventory), 0);
  const value = rows.reduce((sum, row) => sum + Number(row.inventory) * Number(row.price), 0);

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700"><ArrowLeft size={16} />{returnCategory ? `Back to ${returnCategory}` : "Back to catalog"}</Link>
    {error ? <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><p role="alert">{error}</p><button type="button" onClick={() => { setError(""); setLoadAttempt((attempt) => attempt + 1); }} className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold hover:bg-rose-100">Retry loading product</button></div> : !product || !selected ? <p role="status" className="mt-8 flex items-center gap-2 text-sm text-violet-700"><LoaderCircle size={18} className="animate-spin" />Loading product details…</p> : <>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-5"><div className="max-w-3xl"><span className="inline-flex items-center gap-1.5 rounded-md bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700"><Package size={13} />{product.draft.category}</span><h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{product.draft.productName}</h1><p className="mt-2 text-xs text-slate-500">Saved {new Date(product.createdAt).toLocaleDateString("en-IN")} · Updated {new Date(product.updatedAt).toLocaleString("en-IN")} · Revision {product.databaseRevision}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setExporting(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"><Download size={16} />Export Excel</button><Link href={`/create-general-product?productId=${product.databaseId}`} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><Pencil size={16} />Edit product & variants</Link></div></header>
      <div className="mt-4 flex flex-wrap items-center gap-3"><Link href={generalProductAddVariantsHref(product.databaseId)} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100"><Plus size={16} />Add variants</Link><p className="text-xs text-slate-500">Keep existing listings and add more AI-generated variants to this saved product.</p></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{[
        ["Listing SKUs", `${number(rows.length)} (${product.variants.length} variants)`],
        ["Listed inventory", number(stock)], ["Listed stock value", money(value)],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white px-5 py-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}</div>
      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:sticky lg:top-6" aria-label="Parent and variant listings"><div className="border-b border-slate-100 p-5"><h2 className="flex items-center gap-2 font-bold"><Layers3 size={17} className="text-violet-600" />Parent & variants</h2><p className="mt-1.5 text-xs leading-5 text-slate-500">Select a listing to see all its saved values.</p><label className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3"><Search size={14} className="text-slate-400" /><input aria-label="Search product variants" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or SKU…" className="h-9 w-full min-w-0 text-xs outline-none" /></label></div><div className="max-h-[540px] overflow-y-auto p-2">{matches.map((row) => <button key={row.id} aria-pressed={selected.id === row.id} aria-label={`View ${row.sku}`} onClick={() => setSelectedId(row.id)} className={`mb-1 block w-full rounded-xl border p-3 text-left transition ${selected.id === row.id ? "border-violet-200 bg-violet-50" : "border-transparent hover:bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><span className={`text-[10px] font-bold uppercase tracking-wide ${row.id === rows[0].id ? "text-violet-700" : "text-slate-400"}`}>{row.id === rows[0].id ? "Parent listing" : `Variant V${product.variants.find((variant) => variant.id === row.id)?.version}`}</span><span className="text-xs font-semibold text-slate-700">{money(Number(row.price))}</span></div><p className="mt-2 line-clamp-2 text-xs font-medium leading-5">{row.productName}</p><p className="mt-1 text-[10px] font-semibold text-violet-700">Group {row.groupId}</p><p className="mt-1 break-all text-[10px] text-slate-500">{row.sku}</p></button>)}{!matches.length && <p className="p-4 text-xs text-slate-500">No matching listings.</p>}</div></aside>
        <div className="min-w-0 space-y-5"><section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5"><p className="text-xs font-semibold text-violet-700">{selected.id === rows[0].id ? "Parent listing details" : "Variant listing details"}</p><h2 className="mt-2 text-lg font-bold leading-7">{selected.productName}</h2><p className="mt-2 break-all font-mono text-xs text-slate-500">{selected.sku}</p><p className="mt-3 text-xs leading-5 text-slate-500">Values below include this variant’s overrides. Use Edit product & variants to change them, then save to the database.</p></section>
          {GENERAL_PRODUCT_DETAIL_SECTIONS.map((section) => <section key={section.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h3 className="border-b border-slate-100 px-5 py-4 text-sm font-bold">{section.title}</h3><dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2">{section.fields.map(([field, label]) => {
            const value = selected[field];
            const url = field.startsWith("image") ? imageHref(value) : null;
            return <div key={field} className={field === "description" || field === "productName" || field.endsWith("Address") ? "sm:col-span-2" : ""}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1.5 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-800">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-1.5 break-all text-violet-700 hover:underline"><span>{value}</span><ExternalLink size={13} className="mt-1.5 shrink-0" /></a> : value || <span className="font-normal text-slate-400">Not provided</span>}</dd></div>;
          })}</dl></section>)}
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-bold">Saved record</h3><dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2"><div><dt className="text-slate-500">Database ID</dt><dd className="mt-1 break-all font-mono">{product.databaseId}</dd></div><div><dt className="text-slate-500">Listing ID</dt><dd className="mt-1 break-all font-mono">{selected.id}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Product context</dt><dd className="mt-1 whitespace-pre-wrap leading-5">{product.productContext || "Not provided"}</dd></div></dl></section>
        </div>
      </div><p className="mt-5 text-[11px] leading-5 text-slate-400">Inventory and stock value are listed SKU totals, not verified physical stock or sales. This family may contain listings in multiple categories; exports keep categories separate.</p>
      {exporting && <GeneralProductExportDialog target={{ product, category: selected.category }} onClose={() => setExporting(false)} />}
    </>}
  </div></main>;
}
