"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Search, Trash2 } from "lucide-react";
import type { GeneralProductListing } from "@/components/listing-tool/original/lib/general-product-excel";
import { generalProductBatchRows, type GeneralProductBatchItem } from "@/components/listing-tool/original/lib/general-product-batch";
import { GENERAL_PRODUCT_TEMPLATE_COLUMNS, generalProductPreviewColumns, type GeneralProductColumn } from "@/components/listing-tool/original/lib/general-product-columns";
import { GENERAL_PRODUCT_REVIEW_VIEWS, generalProductReviewColumns, isGeneralProductImageField, type GeneralProductReviewView } from "@/components/listing-tool/original/lib/general-product-review";
import { GeneralProductImagePreview, GeneralProductImageUrlField } from "./GeneralProductImages";
import GeneralProductRowEditor from "./GeneralProductRowEditor";
import MeeshoVariantImagesUpload from "./MeeshoVariantImagesUpload";

export type GeneralProductTableField = Exclude<keyof GeneralProductListing, "id">;

function columnWidth(column: GeneralProductColumn) {
  return column.field === "productName" ? 320 : column.field === "description" ? 360
    : column.field === "sku" || column.field === "styleId" || isGeneralProductImageField(column.field) ? 260
      : column.numeric || column.field === "groupId" ? 120 : 180;
}

export default function GeneralProductPreviewTable({
  products, disabled, onEdit, onRemove, onChange, onClear, columns = GENERAL_PRODUCT_TEMPLATE_COLUMNS,
}: {
  products: GeneralProductBatchItem[];
  columns?: GeneralProductColumn[];
  disabled: boolean;
  onEdit: (id: string) => void;
  onRemove: (productId: string, rowId?: string) => void;
  onChange: (productId: string, rowId: string, field: GeneralProductTableField, value: string) => void;
  onClear: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [view, setView] = useState<GeneralProductReviewView>("quick");
  const [query, setQuery] = useState("");
  const [editingRow, setEditingRow] = useState<{ productId: string; rowId: string } | null>(null);
  const variantCount = products.reduce((total, item) => total + item.variants.length, 0);
  const templateColumns = generalProductPreviewColumns(columns);
  const visibleColumns = generalProductReviewColumns(columns, view);
  const selectedView = GENERAL_PRODUCT_REVIEW_VIEWS.find((option) => option.id === view)!;
  const search = query.trim().toLowerCase();
  const matches = (row: GeneralProductListing) => [row.productName, row.sku, row.groupId, row.category].some((value) => value.toLowerCase().includes(search));
  const productRows = products.map((item) => {
    const rows = generalProductBatchRows(item);
    const parentMatches = !search || matches(rows[0]);
    const matchingVariants = rows.slice(1).some(matches);
    return { item, rows: rows.map((row, index) => ({ row, index })).filter(({ row, index }) =>
      search ? parentMatches || (index === 0 ? matchingVariants : matches(row)) : index === 0 || !collapsed.has(item.draft.id)),
    };
  }).filter(({ rows }) => rows.length);
  const selectedItem = products.find((item) => item.draft.id === editingRow?.productId);
  const selectedRow = selectedItem && generalProductBatchRows(selectedItem).find((row) => row.id === editingRow?.rowId);
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Review your batch</h2>
            <p className="mt-1 text-sm text-slate-500">{products.length} parent products · {variantCount} variants · {products.length + variantCount} listing rows</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={disabled} onClick={() => setCollapsed(new Set())} className="rounded-lg border px-3 py-2 text-xs font-semibold">Expand all</button>
            <button type="button" disabled={disabled} onClick={() => setCollapsed(new Set(products.map((item) => item.draft.id)))} className="rounded-lg border px-3 py-2 text-xs font-semibold">Collapse all</button>
            <button type="button" disabled={disabled || !products.length} onClick={onClear} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50">Clear batch</button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Review table views">
            {GENERAL_PRODUCT_REVIEW_VIEWS.map((option) => <button key={option.id} type="button" aria-pressed={view === option.id} onClick={() => setView(option.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-violet-500 ${view === option.id ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{option.label}</button>)}
          </div>
          <label className="relative min-w-0 sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
            <span className="sr-only">Search batch</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, SKU or group…" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
          </label>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{selectedView.description} {visibleColumns.length} of {templateColumns.length} Excel fields shown. Parent Group 1, then variants 2, 3, 4…</p>
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">Click a field to edit, or use Edit row for a guided form. Changes are not saved to the database until you click Save batch to database.</p>
      </div>
      {products.filter(item=>item.variants.length>0).map(item=>{const rows=generalProductBatchRows(item);return <details key={item.draft.id} open={products.length===1} className="mx-5 mb-4 rounded-xl border border-violet-200 px-3 sm:mx-6"><summary className="cursor-pointer py-3 text-xs font-bold text-violet-800">Bulk variant main images · {item.draft.productName}</summary><MeeshoVariantImagesUpload productId={item.draft.id} variants={item.variants.map((variant,index)=>({...rows[index+1],rowId:variant.id,version:variant.version,title:variant.productName}))} disabled={disabled} onChange={(rowId,url)=>onChange(item.draft.id,rowId,"image1",url)}/></details>;})}
      {!products.length ? <p className="m-5 rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No products in the batch yet. Generate a title, then add the product.</p> : !productRows.length ? <p className="m-5 rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No listings match “{query}”. <button type="button" onClick={() => setQuery("")} className="font-semibold text-violet-700 hover:underline">Clear search</button></p> : (
        <div className="relative isolate max-h-[650px] overflow-auto">
          <table aria-label="General product batch preview" style={{ minWidth: 160 + visibleColumns.reduce((total, column) => total + columnWidth(column), 0) }} className="w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col style={{ width: 160 }} />
              {visibleColumns.map((column) => <col key={column.field} style={column.field === "productName" ? undefined : { width: columnWidth(column) }} />)}
            </colgroup>
            <thead className="sticky top-0 z-30 bg-slate-100">
              <tr>
                <th className="sticky left-0 z-40 min-w-[160px] bg-slate-100 p-3 text-left">Image / listing</th>
                {visibleColumns.map((column) => <th key={column.field} className={`p-3 text-left ${column.field === "sku" || column.field === "styleId" || isGeneralProductImageField(column.field) ? "min-w-[260px]" : column.numeric || column.field === "groupId" ? "min-w-[120px]" : "min-w-[180px]"} ${column.field === "productName" ? "sm:sticky sm:left-[160px] z-40 min-w-[320px] bg-slate-100" : ""}`}>{column.label}</th>)}
              </tr>
            </thead>
            {productRows.map(({ item, rows }) => <tbody key={item.draft.id} aria-label={`Product starting at Group ${item.draft.groupId}`}>
              {rows.map(({ row, index }) => (
                <tr key={row.id} className={`border-t border-slate-200 ${index === 0 ? "bg-blue-50/50" : "bg-white"}`}>
                  <td className={`sticky left-0 z-20 min-w-[160px] p-3 align-top ${index === 0 ? "bg-blue-50" : "bg-white"}`}>
                    <div className="flex items-start gap-2">
                      <GeneralProductImagePreview value={row.image1} label={`${row.sku} front image`} compact className="h-16 w-16 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1 font-bold text-slate-700">
                          {index === 0 && <button type="button" disabled={disabled || !!search} aria-label={`Toggle variants ${row.sku}`} aria-expanded={!collapsed.has(row.id) || !!search} onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })}>{collapsed.has(row.id) && !search ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</button>}
                          {index === 0 ? "Parent" : "Variant"}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">V{index === 0 ? item.parentVersion : item.variants[index - 1].version}</p>
                        <p className="mt-1 inline-flex rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">Group {row.groupId}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button type="button" disabled={disabled} aria-label={`Edit row ${row.sku}`} onClick={() => setEditingRow({ productId: item.draft.id, rowId: row.id })} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2 py-1.5 font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"><Pencil size={12} />Edit row</button>
                      <button type="button" disabled={disabled} title="Remove from local batch" aria-label={`Remove ${index === 0 ? "product" : "variant"} ${row.sku}`} onClick={() => onRemove(item.draft.id, index === 0 ? undefined : row.id)} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button>
                    </div>
                    {index === 0 && <button type="button" disabled={disabled} aria-label={`Edit product ${row.sku}`} onClick={() => onEdit(item.draft.id)} className="mt-2 text-[10px] font-semibold text-blue-700 hover:underline">Product setup & variants</button>}
                  </td>
                  {visibleColumns.map(({ field, label, numeric }) => (
                    <td key={field} className={`p-2 align-top ${field === "productName" ? `sm:sticky sm:left-[160px] z-10 min-w-[320px] ${index === 0 ? "bg-blue-50" : "bg-white"}` : ""}`}>
                      {isGeneralProductImageField(field) ? <GeneralProductImageUrlField target={{ rowId: row.id, field }} label={label} inputLabel={`${label} ${row.sku}`} primary={field === "image1"} compact value={row[field]} disabled={disabled} onChange={(value) => onChange(item.draft.id, row.id, field, value)} /> : field === "groupId" ? <p aria-label={`${label} ${row.sku}`} className="break-all px-2 py-3 font-semibold text-slate-600">{row[field]}</p> : field === "productName" || field === "description" ? (
                        <textarea aria-label={`${label} ${row.sku}`} value={row[field]} disabled={disabled} onChange={(event) => onChange(item.draft.id, row.id, field, event.target.value)} rows={3} className="w-full min-w-[280px] rounded-lg border border-slate-200 bg-white p-2 leading-5 outline-none focus:border-blue-500" />
                      ) : (
                        <input aria-label={`${label} ${row.sku}`} type={numeric ? "number" : "text"} value={row[field]} disabled={disabled} onChange={(event) => onChange(item.draft.id, row.id, field, event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>)}
          </table>
        </div>
      )}
      {selectedRow && editingRow && <GeneralProductRowEditor key={selectedRow.id} row={selectedRow} columns={templateColumns} disabled={disabled} isParent={editingRow.productId === editingRow.rowId} onChange={(field, value) => onChange(editingRow.productId, editingRow.rowId, field, value)} onClose={() => setEditingRow(null)} />}
    </section>
  );
}
