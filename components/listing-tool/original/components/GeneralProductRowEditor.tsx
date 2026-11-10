"use client";

import type { GeneralProductListing } from "@/components/listing-tool/original/lib/general-product-excel";
import type { GeneralProductColumn } from "@/components/listing-tool/original/lib/general-product-columns";
import { generalProductReviewSections, isGeneralProductImageField } from "@/components/listing-tool/original/lib/general-product-review";
import GeneralProductImages from "./GeneralProductImages";
import GeneralProductDialog from "./GeneralProductDialog";

export default function GeneralProductRowEditor({ row, columns, disabled, isParent, onChange, onClose }: {
  row: GeneralProductListing;
  columns: GeneralProductColumn[];
  disabled: boolean;
  isParent: boolean;
  onChange: (field: Exclude<keyof GeneralProductListing, "id">, value: string) => void;
  onClose: () => void;
}) {
  return <GeneralProductDialog title={`Edit listing · Group ${row.groupId}`} description="Edits update your local batch. Save the batch to store them in the database." onClose={onClose} footer={<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">SKU and Style ID stay matched. Group ID is automatic.</p><button type="button" onClick={onClose} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700">Done editing</button></div>}>
    <div className="space-y-6">
      {isParent && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">You are editing the parent. Its default prices, stock, images and supplier details also apply to variants that have not been customized.</p>}
      {generalProductReviewSections(columns).map((section) => <section key={section.title} className="rounded-xl border border-slate-200 p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-950">{section.title}</h3>
        {section.title === "Product images" ? <GeneralProductImages rowId={row.id} listing={row} disabled={disabled} fields={section.columns.map(({ field }) => field).filter(isGeneralProductImageField)} onChange={onChange} /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.columns.map(({ field, label, numeric }) => <label key={field} className={`block min-w-0 ${field === "productName" || field === "description" ? "sm:col-span-2 lg:col-span-3" : ""}`}>
            <span className="text-xs font-semibold text-slate-600">{label}</span>
            {field === "productName" || field === "description" ? <textarea value={row[field]} rows={field === "description" ? 4 : 2} disabled={disabled} onChange={(event) => onChange(field, event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /> : <input value={row[field]} type={numeric ? "number" : "text"} readOnly={field === "groupId"} disabled={disabled} onChange={(event) => onChange(field, event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none read-only:bg-slate-100 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />}
          </label>)}
        </div>}
      </section>)}
    </div>
  </GeneralProductDialog>;
}
