"use client";

import Image from "next/image";
import Link from "@/components/listing-tool/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Boxes, ChevronDown, ChevronRight, CircleDollarSign, Download, Eye, Filter, FolderOpen, Layers3, LoaderCircle, Package, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import {
  categoryHref, filterGeneralProductCatalog, generalProductCatalogFamilies, generalProductCategorySummaries,
  generalProductAddVariantsHref, generalProductDetailsHref, generalProductStockStatus, listingMoney as money, listingNumber as number,
  loadCategoryProducts, summarizeGeneralProductCatalog, type GeneralProductCatalogResponse,
} from "@/components/listing-tool/original/lib/general-product-catalog";
import type { GeneralProductListing } from "@/components/listing-tool/original/lib/general-product-excel";
import { generalProductsRequest, type SavedGeneralProduct } from "@/components/listing-tool/original/lib/general-products-api";
import GeneralProductExportDialog, { type GeneralProductExportTarget } from "./GeneralProductExportDialog";

const secondaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const filterClass = "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-blue-500";
const parentGrid = "grid gap-3 lg:grid-cols-[38px_minmax(200px,1.8fr)_120px_85px_85px_90px_160px] lg:items-center lg:gap-3";
const variantGrid = "grid gap-3 lg:grid-cols-[70px_minmax(200px,1.8fr)_120px_85px_85px_90px_110px] lg:items-center lg:gap-3";

export default function GeneralProductCatalog({ category = "" }: { category?: string }) {
  const [products, setProducts] = useState<SavedGeneralProduct[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [directorySearch, setDirectorySearch] = useState("");
  const [query, setQuery] = useState("");
  const [productType, setProductType] = useState("");
  const [stock, setStock] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [exportTarget, setExportTarget] = useState<GeneralProductExportTarget | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    loadCategoryProducts(category, (path) => generalProductsRequest<GeneralProductCatalogResponse>(path, { signal: controller.signal }),
      (loaded, total) => { if (!cancelled) setProgress(`${number(loaded)} of ${number(total)} product families`); })
      .then((saved) => {
        if (cancelled) return;
        const firstLoad = !initialized.current;
        initialized.current = true;
        const families = generalProductCatalogFamilies(saved, category);
        setProducts(saved);
        setSelectedSkus((current) => new Set(families.flatMap((family) => family.rows).filter((row) => firstLoad || current.has(row.sku)).map((row) => row.sku)));
        setExpanded((current) => new Set(families.filter((family) => firstLoad || current.has(family.product.databaseId)).map((family) => family.product.databaseId)));
      })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load saved general products."); })
      .finally(() => { if (!cancelled) { setLoading(false); setProgress(""); } });
    return () => { cancelled = true; controller.abort(); };
  }, [category, refreshKey]);

  const families = useMemo(() => generalProductCatalogFamilies(products || [], category), [products, category]);
  const stats = useMemo(() => summarizeGeneralProductCatalog(families), [families]);
  const categories = useMemo(() => generalProductCategorySummaries(products || []), [products]);
  const visibleCategories = categories.filter((item) => item.name.toLowerCase().includes(directorySearch.trim().toLowerCase()));
  const filtered = useMemo(() => filterGeneralProductCatalog(families, { query, productType, stock, sort }), [families, query, productType, stock, sort]);
  const types = [...new Set(families.flatMap((family) => family.rows.map((row) => row.productType)))].sort();
  const rows = families.flatMap((family) => family.rows);
  const selectedRows = rows.filter((row) => selectedSkus.has(row.sku));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const ready = products !== null;
  const refresh = () => { setLoading(true); setError(""); setRefreshKey((value) => value + 1); };
  const clearFilters = () => { setQuery(""); setProductType(""); setStock(""); setSort("newest"); setPage(1); };
  const toggleSelection = (selection: GeneralProductListing[]) => setSelectedSkus((current) => {
    const next = new Set(current);
    const allSelected = selection.every((row) => current.has(row.sku));
    selection.forEach((row) => { if (allSelected) next.delete(row.sku); else next.add(row.sku); });
    return next;
  });
  const exportSelection = () => setExportTarget({ category, rows: selectedRows });
  async function deleteProduct(product: SavedGeneralProduct) {
    if (!window.confirm(`Delete ${product.draft.sku} and all ${product.variants.length} variants from the database? This cannot be undone. Phone products will not be affected.`)) return;
    setDeleting(product.databaseId); setError(""); setNotice("");
    try {
      await generalProductsRequest(`/${product.databaseId}?revision=${product.databaseRevision}`, { method: "DELETE" });
      setNotice("General product and its variants deleted."); refresh();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete product."); }
    finally { setDeleting(null); }
  }

  const metrics = category ? [
    { label: "Products", value: stats.families, helper: "Parent product families", icon: <Package size={18} /> },
    { label: "Variants", value: stats.variants, helper: "Linked listings", icon: <Layers3 size={18} /> },
    { label: "Total Records", value: stats.records, helper: "Category listing SKUs", icon: <Boxes size={18} /> },
    { label: "Inventory", value: number(stats.inventory), helper: "Listed units across SKUs", icon: <Boxes size={18} /> },
    { label: "Catalog value", value: money(stats.value), helper: "Price × listed inventory", icon: <CircleDollarSign size={18} /> },
    { label: "Stock alerts", value: stats.lowStock + stats.outOfStock, helper: `${stats.lowStock} low · ${stats.outOfStock} out`, icon: <Package size={18} />, alert: stats.lowStock + stats.outOfStock > 0 },
  ] : [
    { label: "Categories", value: categories.length, helper: "Available catalogs", icon: <FolderOpen size={18} /> },
    { label: "Parent products", value: stats.parents, helper: "Across all categories", icon: <Package size={18} /> },
    { label: "Variants", value: stats.variants, helper: `${number(stats.records)} total records`, icon: <Layers3 size={18} /> },
    { label: "Inventory", value: number(stats.inventory), helper: "Listed units across catalog", icon: <Boxes size={18} /> },
    { label: "Catalog value", value: money(stats.value), helper: "Price × listed inventory", icon: <CircleDollarSign size={18} /> },
    { label: "Stock alerts", value: stats.lowStock + stats.outOfStock, helper: `${stats.lowStock} low · ${stats.outOfStock} out`, icon: <Package size={18} />, alert: stats.lowStock + stats.outOfStock > 0 },
  ];

  return <main className="min-h-screen bg-[#f6f8fb]"><div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <Link href={category ? "/general-products" : "/"} className="mt-0.5 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><ArrowLeft size={17} /><span className="hidden sm:inline">{category ? "All Categories" : "Back to Dashboard"}</span></Link>
          <div><div className="flex flex-wrap items-center gap-2"><BarChart3 size={20} className="text-blue-600" /><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{category ? `${category} Catalog` : "Category Analytics"}</h1><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">{category ? `${ready ? number(stats.records) : "—"} records` : "Choose a category"}</span></div><p className="mt-1 text-sm text-slate-500">{category ? `Manage parent products, variants, pricing and inventory for ${category}.` : "Select a category to open its products, variants and inventory workspace."}</p></div>
        </div>
        <div className="flex flex-wrap gap-2"><button onClick={refresh} disabled={loading || !!deleting} className={secondaryButton}><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>{category && <button onClick={exportSelection} disabled={loading || !selectedRows.length} className={secondaryButton}><Download size={16} />Export Excel ({selectedRows.length})</button>}<Link href="/create-general-product" className={primaryButton}><Plus size={17} />Create Product</Link></div>
      </div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    <section aria-label="Catalog analytics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{metrics.map((metric) => <MiniStat key={metric.label} {...metric} value={ready ? metric.value : "—"} />)}</section>
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-blue-700"><LoaderCircle size={16} className="animate-spin" />{products ? "Refreshing saved records…" : "Loading saved records…"} {progress}</p>}

    {!category ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Category directory</p><h2 className="mt-1 text-lg font-bold text-slate-900">Choose a product category</h2><p className="mt-1 text-xs text-slate-500">Every card contains analytics calculated from its saved parents and variants.</p></div><SearchInput label="Search product categories" value={directorySearch} onChange={setDirectorySearch} placeholder="Search Beads & Charms, accessories…" onClear={() => setDirectorySearch("")} className="w-full lg:w-80" /></div>
      {visibleCategories.length ? <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">{visibleCategories.map((item) => <Link key={item.name} href={categoryHref(item.name)} aria-label={`Open ${item.name} catalog`} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FolderOpen size={20} /></span><div className="min-w-0"><h3 className="truncate text-base font-bold text-slate-900 group-hover:text-blue-700">{item.name}</h3><p className="mt-1 text-[11px] text-slate-500">General product listings</p></div></div>{item.lowStock + item.outOfStock > 0 && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">{item.lowStock + item.outOfStock} alerts</span>}</div><div className="mt-4 grid grid-cols-2 gap-2">{[["Products", number(item.families)], ["Variants", number(item.variants)], ["Total records", number(item.records)], ["Inventory", number(item.inventory)], ["Stock alerts", number(item.lowStock + item.outOfStock)], ["Value", money(item.value)]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-xs font-bold text-slate-800">{value}</p></div>)}</div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[11px] font-medium text-slate-400">{item.records} saved listing SKUs</span><span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">View catalog<ArrowRight size={14} /></span></div></Link>)}</div> : !loading && <EmptyState title={directorySearch ? "No matching categories" : error ? "Categories unavailable" : "No categories found"} description={directorySearch ? "Try another category name." : error ? "Refresh after the database connection is available." : "Create a general product and save it to the database. Its category will appear automatically."} />}
    </section> : <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center"><SearchInput label="Search saved general products" value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search product, SKU, code, group…" onClear={() => { setQuery(""); setPage(1); }} className="flex-1" /><div className="flex flex-wrap items-center gap-2">
          <select aria-label="Filter by product type" value={productType} onChange={(event) => { setProductType(event.target.value); setPage(1); }} className={filterClass}><option value="">All Product Types</option>{types.map((type) => <option key={type}>{type}</option>)}</select>
          <select aria-label="Filter by stock" value={stock} onChange={(event) => { setStock(event.target.value); setPage(1); }} className={filterClass}><option value="">All Stock</option><option value="in-stock">In Stock</option><option value="low-stock">Low Stock (1–10)</option><option value="out-of-stock">Out of Stock</option></select>
          <select aria-label="Sort products" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className={filterClass}><option value="newest">Newest</option><option value="name">Name</option><option value="price-low">Price Low</option><option value="price-high">Price High</option><option value="stock-high">Stock High</option></select>
          <button onClick={() => setExpanded(new Set(filtered.map((family) => family.product.databaseId)))} className={secondaryButton}><ChevronDown size={15} />Expand</button><button onClick={() => setExpanded(new Set())} className={secondaryButton}><ChevronRight size={15} />Collapse</button><button onClick={clearFilters} className={secondaryButton}><Filter size={15} />Clear</button>
        </div></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3"><div><p className="text-xs font-bold text-blue-800">Export selection</p><p className="mt-0.5 text-[11px] text-blue-700">{selectedRows.length} selected records · includes parents and variants</p></div><div className="flex flex-wrap gap-2"><button disabled={loading || !filtered.length} onClick={() => setSelectedSkus((current) => new Set([...current, ...filtered.flatMap((family) => family.rows.map((row) => row.sku))]))} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">Select All</button><button aria-label="Clear export selection" onClick={() => setSelectedSkus(new Set())} disabled={!selectedRows.length} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Clear</button><button onClick={exportSelection} disabled={loading || !selectedRows.length} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Download size={13} />Export Selected</button><button onClick={() => setExportTarget({ category })} disabled={loading || !rows.length} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-700 disabled:opacity-50">Export Entire Category</button></div></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>Showing <strong className="text-slate-600">{filtered.length}</strong> of <strong className="text-slate-600">{families.length}</strong> product families</span><span>Listed inventory value: <strong className="text-slate-700">{money(stats.value)}</strong></span></div>
      </section>
      {visible.length ? <section aria-label="Parent products and variants" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="font-bold text-slate-900">Catalog records</h2><p className="mt-1 text-xs text-slate-500">Parents and their variants are grouped together. Select a title to view complete listing details.</p></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">{filtered.length} parent {filtered.length === 1 ? "product" : "products"}</span></div>
        <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 lg:grid lg:grid-cols-[38px_minmax(200px,1.8fr)_120px_85px_85px_90px_160px] lg:items-center lg:gap-3"><div /><div>Product</div><div>Type / Pack</div><div>Price</div><div>MRP</div><div>Stock</div><div className="text-right">Actions</div></div>
        <div className="divide-y divide-slate-200">{visible.map((family) => {
          const { product, parent, variants } = family;
          const isExpanded = expanded.has(product.databaseId);
          const selectedCount = family.rows.filter((row) => selectedSkus.has(row.sku)).length;
          const editHref = `/create-general-product?productId=${product.databaseId}`;
          return <article key={product.databaseId} aria-label={`Parent ${parent.sku}`}>
            <div className="px-3 py-4 lg:px-4"><div className={parentGrid}>
              <div>{variants.length ? <button aria-label={`${isExpanded ? "Collapse" : "Expand"} variants for ${parent.sku}`} aria-expanded={isExpanded} aria-controls={`general-variants-${product.databaseId}`} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(product.databaseId)) next.delete(product.databaseId); else next.add(product.databaseId); return next; })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button> : <div className="hidden h-8 w-8 lg:block" />}</div>
              <div className="flex min-w-0 items-center gap-3"><ProductThumbnail row={parent} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><Link href={generalProductDetailsHref(product, parent, category)} className="max-w-full truncate text-left text-sm font-bold text-slate-900 hover:text-blue-600" title={parent.productName}>{parent.productName}</Link><VersionBadge version={product.parentVersion} /><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{variants.length} variants</span>{!family.parentInCategory && <span className="text-[10px] text-amber-700">Related parent · {parent.category}</span>}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500"><span>{parent.brand || "No brand"}</span><span>{parent.category}</span><span>{parent.genericName}</span></div><p className="mt-1 break-all text-[10px] text-slate-400">{parent.sku}</p><div className="mt-1.5 flex flex-wrap gap-1.5">{parent.groupId && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Group {parent.groupId}</span>}<StockBadge row={parent} /></div></div></div>
              <TypeAndPack row={parent} /><PriceCell row={parent} /><MrpCell row={parent} /><div className="hidden lg:block"><StockBadge row={parent} /></div>
              <div className="flex flex-wrap items-center gap-1 lg:justify-end"><SelectionCheckbox label={`Select parent and variants for ${parent.sku}`} checked={selectedCount === family.rows.length} indeterminate={selectedCount > 0 && selectedCount < family.rows.length} onChange={() => toggleSelection(family.rows)} disabled={loading || !!deleting} /><ActionLink href={generalProductDetailsHref(product, parent, category)} label={`View product ${parent.sku}`}><Eye size={15} /></ActionLink><ActionLink href={editHref} label={`Edit product ${parent.sku}`}><Pencil size={15} /></ActionLink><ActionButton label={`Export product ${parent.sku}`} disabled={loading || !!deleting} onClick={() => setExportTarget({ category, product })}><Download size={15} /></ActionButton><ActionButton label={`Delete saved general product ${parent.sku}`} disabled={loading || !!deleting} onClick={() => void deleteProduct(product)} danger>{deleting === product.databaseId ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}</ActionButton></div>
            </div><div className="mt-3 flex items-center gap-3 lg:ml-[50px]"><Link href={generalProductAddVariantsHref(product.databaseId)} aria-label={`Add variants to ${parent.sku}`} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"><Plus size={13} />Add variants</Link></div><MobilePricing row={parent} /></div>
            {isExpanded && variants.length > 0 && <div id={`general-variants-${product.databaseId}`} className="border-t border-slate-100 bg-slate-50"><div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Variants</div><div className="divide-y divide-slate-200">{variants.map(({ row, version }) => <div key={row.sku} aria-label={`Variant ${row.sku}`} className="px-4 py-3 lg:pl-14"><div className={variantGrid}><div className="flex items-center gap-2"><SelectionCheckbox label={`Select ${row.sku} for export`} checked={selectedSkus.has(row.sku)} onChange={() => toggleSelection([row])} disabled={loading || !!deleting} /><VersionBadge version={version} /></div><div className="flex min-w-0 items-center gap-3"><ProductThumbnail row={row} small /><div className="min-w-0"><Link href={generalProductDetailsHref(product, row, category)} title={row.productName} className="block max-w-full truncate text-xs font-bold text-slate-800 hover:text-blue-600">{row.productName}</Link><p className="mt-1 text-[10px] text-slate-400">{row.color || "No color"} · {row.variation || "Free Size"} · Group {row.groupId}</p><p className="mt-1 break-all text-[10px] text-slate-400">{row.sku}</p></div></div><TypeAndPack row={row} /><PriceCell row={row} /><MrpCell row={row} /><div className="hidden lg:block"><StockBadge row={row} /></div><div className="flex items-center gap-1 lg:justify-end"><ActionLink href={generalProductDetailsHref(product, row, category)} label={`View variant ${row.sku}`}><Eye size={14} /></ActionLink><ActionLink href={editHref} label={`Edit variant ${row.sku}`}><Pencil size={14} /></ActionLink><ActionButton label={`Export variant ${row.sku}`} disabled={loading || !!deleting} onClick={() => setExportTarget({ category, rows: [row] })}><Download size={14} /></ActionButton></div></div><MobilePricing row={row} /></div>)}</div></div>}
          </article>;
        })}</div>
        {pages > 1 && <div className="flex items-center justify-between border-t border-slate-200 p-4 text-xs text-slate-500"><p>Page {currentPage} of {pages}</p><div className="flex gap-2"><button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className={secondaryButton}>Previous</button><button disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className={secondaryButton}>Next</button></div></div>}
      </section> : !loading && <section className="rounded-2xl border border-dashed border-slate-300 bg-white"><EmptyState title="No products found" description={families.length ? "Try a different search term or clear the filters." : "Save a general product in this category to see its parent and variants here."} /></section>}
    </>}
    <p className="text-[11px] leading-5 text-slate-400">Inventory and value are listed SKU totals; variants may share physical stock. Value is not sales or revenue. Stock alerts mean 1–10 units or out of stock. Phone listings remain separate.</p>
  </div>{exportTarget && <GeneralProductExportDialog target={exportTarget} onClose={() => setExportTarget(null)} />}</main>;
}

function MiniStat({ label, value, helper, icon, alert = false }: { label: string; value: string | number; helper: string; icon: ReactNode; alert?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p title={String(value)} className={`mt-1 truncate font-bold tracking-tight text-slate-900 ${typeof value === "string" && value.startsWith("₹") ? "text-base" : "text-xl"}`}>{typeof value === "number" ? number(value) : value}</p></div><span className={`shrink-0 rounded-xl p-2.5 ${alert ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>{icon}</span></div><p className={`mt-3 text-[11px] font-medium ${alert ? "text-red-500" : "text-slate-400"}`}>{helper}</p></div>;
}
function SearchInput({ label, value, onChange, onClear, placeholder, className }: { label: string; value: string; onChange: (value: string) => void; onClear: () => void; placeholder: string; className: string }) {
  return <div className={`relative min-w-0 ${className}`}><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label={label} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />{value && <button aria-label={`Clear ${label.toLowerCase()}`} onClick={onClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={14} /></button>}</div>;
}
function SelectionCheckbox({ label, checked, indeterminate = false, onChange, disabled }: { label: string; checked: boolean; indeterminate?: boolean; onChange: () => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (input.current) input.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={input} type="checkbox" aria-label={label} title={label} checked={checked} onChange={onChange} disabled={disabled} className="mx-1 h-4 w-4 shrink-0 accent-blue-600" />;
}
function ProductThumbnail({ row, small = false }: { row: GeneralProductListing; small?: boolean }) {
  const [failedSource, setFailedSource] = useState("");
  const source = [row.image1, row.image2, row.image3, row.image4].find((value) => /^https?:\/\//i.test(value));
  return <span className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100 text-slate-300 ${small ? "h-10 w-10 rounded-lg" : "h-14 w-14 rounded-xl"}`}>{source && source !== failedSource ? <Image src={source} alt={row.productName} width={small ? 40 : 56} height={small ? 40 : 56} unoptimized className="h-full w-full object-cover" onError={() => setFailedSource(source)} /> : <Package size={small ? 16 : 20} />}</span>;
}
function VersionBadge({ version }: { version: number }) { return <span className="inline-flex rounded-md bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">V{version}</span>; }
function StockBadge({ row }: { row: GeneralProductListing }) {
  const status = generalProductStockStatus(row.inventory);
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${status === "out-of-stock" ? "bg-red-50 text-red-600" : status === "low-stock" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{number(Number(row.inventory))} {status === "out-of-stock" ? "out" : status === "low-stock" ? "low" : "in"}</span>;
}
function TypeAndPack({ row }: { row: GeneralProductListing }) { return <div className="hidden min-w-0 lg:block"><p className="truncate text-xs font-semibold text-slate-700" title={row.productType}>{row.productType}</p><p className="mt-1 text-[10px] text-slate-400">Pack of {row.quantity}</p></div>; }
function PriceCell({ row }: { row: GeneralProductListing }) { return <p className="hidden text-xs font-bold text-slate-900 lg:block">{money(Number(row.price))}</p>; }
function MrpCell({ row }: { row: GeneralProductListing }) { return <p className="hidden text-xs text-slate-400 line-through lg:block">{money(Number(row.mrp))}</p>; }
function MobilePricing({ row }: { row: GeneralProductListing }) { return <div className="mt-3 grid grid-cols-3 gap-2 lg:hidden">{[["Price", money(Number(row.price))], ["MRP", money(Number(row.mrp))], ["Stock", number(Number(row.inventory))]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-100 px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xs font-semibold text-slate-700">{value}</p></div>)}</div>; }
function ActionLink({ href, label, children }: { href: string; label: string; children: ReactNode }) { return <Link href={href} aria-label={label} title={label} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50">{children}</Link>; }
function ActionButton({ label, children, onClick, disabled, danger = false }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) { return <button aria-label={label} title={label} onClick={onClick} disabled={disabled} className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 ${danger ? "text-red-500 hover:bg-red-50" : "text-slate-500 hover:bg-slate-50"}`}>{children}</button>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><span className="rounded-2xl bg-slate-100 p-4 text-slate-400"><FolderOpen size={28} /></span><h3 className="mt-4 font-bold text-slate-900">{title}</h3><p className="mt-2 max-w-md text-sm text-slate-500">{description}</p></div>; }
