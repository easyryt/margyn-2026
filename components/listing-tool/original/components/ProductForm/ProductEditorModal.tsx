"use client";
import MeeshoImageUpload from "@/components/listing-tool/original/components/MeeshoImageUpload";
import MeeshoImageSetUpload from "@/components/listing-tool/original/components/MeeshoImageSetUpload";
import type { MeeshoImageField } from "@/components/listing-tool/original/lib/meesho-upload-contract";

import { Check, Image as ImageIcon, Loader2, RotateCcw, Save, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  changeProductEditorField,
  hasProductEditorChanges,
  mergeProductEditorSave,
  planProductEditorUpdates,
  productEditorVersion,
  productToEditorForm,
  type ProductEditorField,
  type ProductEditorForm,
  type ProductEditorUpdate,
} from "@/components/listing-tool/original/lib/product-editor";
import { BRANDS, CATEGORIES, COLORS, FINISHES, MATERIALS, PRINT_TYPES, PRODUCT_TYPES, THEMES } from "@/components/listing-tool/original/lib/options";
import type { Product } from "./ProductCard";

const API_BASE_URL = "/api/tools/listing-tool";

type Props = {
  product: Product;
  family: Product[];
  onClose: () => void;
  onSaved: (product: Product, keepOpen?: boolean) => void | Promise<void>;
};

type DesignOption = { id: string; designName: string; designCode: string };
type TableField = {
  key: ProductEditorField;
  label: string;
  multiline?: boolean;
  number?: boolean;
  options?: readonly string[];
  width?: string;
  inherited?: boolean;
  image?: boolean;
};

const FIELDS: TableField[] = [
  { key: "models", label: "Compatible Models", multiline: true, width: "min-w-[220px] w-[220px]" },
  { key: "price", label: "Selling Price (₹)", number: true },
  { key: "wrongDefectiveReturnsPrice", label: "Wrong/Defective Return Discount (₹)", number: true, width: "min-w-[180px] w-[180px]" },
  { key: "mrp", label: "MRP (₹)", number: true },
  { key: "inventory", label: "Inventory", number: true },
  { key: "sku", label: "SKU", width: "min-w-[330px] w-[330px]" },
  { key: "styleId", label: "Product ID / Style ID", width: "min-w-[330px] w-[330px]" },
  { key: "brand", label: "Brand", options: BRANDS },
  { key: "category", label: "Category", options: CATEGORIES, width: "min-w-[230px] w-[230px]" },
  { key: "description", label: "Product Description", multiline: true, width: "min-w-[330px] w-[330px]" },
  { key: "designId", label: "Saved Design", inherited: true, width: "min-w-[250px] w-[250px]" },
  { key: "designName", label: "Design Name", inherited: true, width: "min-w-[230px] w-[230px]" },
  { key: "designCode", label: "Design Code", inherited: true },
  { key: "designNumber", label: "Design Number", inherited: true },
  { key: "groupId", label: "Group ID" },
  { key: "printType", label: "Print Type", options: PRINT_TYPES },
  { key: "finish", label: "Finish", options: FINISHES },
  { key: "gst", label: "GST %", number: true },
  { key: "hsn", label: "HSN" },
  { key: "genericName", label: "Generic Name", width: "min-w-[230px] w-[230px]" },
  { key: "country", label: "Country of Origin" },
  { key: "material", label: "Material", options: MATERIALS },
  { key: "color", label: "Color", options: COLORS },
  { key: "theme", label: "Theme", options: THEMES },
  { key: "type", label: "Product Type", options: PRODUCT_TYPES },
  { key: "size", label: "Size" },
  { key: "quantity", label: "Quantity", number: true },
  { key: "weight", label: "Weight (g)", number: true },
  { key: "length", label: "Length (cm)", number: true },
  { key: "width", label: "Width (cm)", number: true },
  { key: "manufacturer", label: "Manufacturer Name" },
  { key: "manufacturerAddress", label: "Manufacturer Address", multiline: true, width: "min-w-[260px] w-[260px]" },
  { key: "manufacturerPincode", label: "Manufacturer Pincode" },
  { key: "packer", label: "Packer Name" },
  { key: "packerAddress", label: "Packer Address", multiline: true, width: "min-w-[260px] w-[260px]" },
  { key: "packerPincode", label: "Packer Pincode" },
  { key: "importer", label: "Importer Name" },
  { key: "importerAddress", label: "Importer Address", multiline: true, width: "min-w-[260px] w-[260px]" },
  { key: "importerPincode", label: "Importer Pincode" },
  ...(["image1", "image2", "image3", "image4"] as const).map((key, index) => ({
    key, label: `Image ${index + 1} URL`, image: true, width: "min-w-[280px] w-[280px]",
  })),
];

const CELL_INPUT = "h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const CELL_TEXTAREA = `${CELL_INPUT} h-auto min-h-20 resize-y py-2 leading-5`;
const BUTTON = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

async function updateProduct(plan: ProductEditorUpdate) {
  const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(plan.product.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan.payload),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null) as { product?: Product; message?: string } | null;
  if (!response.ok || !result?.product) {
    throw new Error(result?.message || "Unable to update this product.");
  }
  return result.product;
}

export default function ProductEditorModal({ product, family, onClose, onSaved }: Props) {
  const [rows, setRows] = useState(() => [...new Map([...family, product].map((item) => [item.id, item])).values()]
    .sort((a, b) => productEditorVersion(a) - productEditorVersion(b)));
  const [forms, setForms] = useState<Record<string, ProductEditorForm>>(() =>
    Object.fromEntries([...family, product].map((item) => [item.id, productToEditorForm(item)])));
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [applySharedFields, setApplySharedFields] = useState(false);
  const [designs, setDesigns] = useState<DesignOption[]>([]);
  const [designsLoading, setDesignsLoading] = useState(false);
  const designsLoaded = useRef(false);
  const busy = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialRowRef = useRef<HTMLTableRowElement>(null);
  const [hasSaved, setHasSaved] = useState(false);

  const dirtyRows = useMemo(() => rows.filter((row) => hasProductEditorChanges(row, forms[row.id])), [rows, forms]);
  const dirtyIds = new Set(dirtyRows.map((row) => row.id));
  const standardVariants = rows.filter((row) => row.parentId && (row.variantType ?? "standard") === "standard");
  const parent = rows.find((row) => !row.parentId);
  const visibleRows = rows.filter((row) => {
    const form = forms[row.id];
    return `${productEditorVersion(row)} ${form.productName} ${form.sku} ${form.models}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  });

  const requestClose = useCallback(() => {
    if (busy.current) return;
    if (dirtyRows.length && !window.confirm("Close without saving your changes?")) return;
    onClose();
  }, [dirtyRows.length, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    initialRowRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const loadDesigns = async () => {
    if (designsLoading || designsLoaded.current) return;
    setDesignsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/designs?limit=250`, { cache: "no-store" });
      const result = await response.json().catch(() => null) as { designs?: DesignOption[]; message?: string } | null;
      if (!response.ok) throw new Error(result?.message || "Unable to load saved designs.");
      setDesigns(result?.designs ?? []);
      designsLoaded.current = true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load saved designs.");
    } finally {
      setDesignsLoading(false);
    }
  };

  const changeField = (id: string, field: ProductEditorField, value: string) => {
    setForms((current) => ({ ...current, [id]: changeProductEditorField(current[id], field, value) }));
    setMessage("");
    setErrors((current) => { const next = { ...current }; delete next[id]; return next; });
  };

  const resetRow = (row: Product) => {
    setForms((current) => ({ ...current, [row.id]: productToEditorForm(row) }));
    setErrors((current) => { const next = { ...current }; delete next[row.id]; return next; });
    setError("");
    setMessage("");
  };

  const saveRows = async (ids: string[]) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    const rowErrors: Record<string, string> = {};
    let nextRows = [...rows];
    const nextForms = { ...forms };
    let lastSaved: Product | undefined;
    let savedCount = 0;

    const accept = (plan: ProductEditorUpdate, updated: Product) => {
      const previous = nextRows.find((row) => row.id === updated.id) ?? plan.product;
      nextForms[updated.id] = mergeProductEditorSave(previous, nextForms[updated.id], updated, plan.direct);
      nextRows = nextRows.map((row) => row.id === updated.id ? updated : row);
      if (!updated.parentId) {
        // The API synchronizes these inherited fields when a parent is saved.
        nextRows = nextRows.map((row) => {
          if (row.parentId !== updated.id) return row;
          const inherited = {
            designId: updated.designId, designName: updated.designName,
            designCode: updated.designCode, designNumber: updated.designNumber,
          };
          const inheritedForm = productToEditorForm({ ...row, ...inherited });
          nextForms[row.id] = {
            ...nextForms[row.id], designId: inheritedForm.designId, designName: inheritedForm.designName,
            designCode: inheritedForm.designCode, designNumber: inheritedForm.designNumber,
          };
          return { ...row, ...inherited };
        });
      }
      lastSaved = updated;
      savedCount += 1;
      setHasSaved(true);
    };

    try {
      const plans = planProductEditorUpdates(rows, forms, ids, applySharedFields);
      if (!plans.length) return;
      setErrors({});
      setSavingIds(new Set(plans.map((plan) => plan.product.id)));
      const parentPlan = plans.find((plan) => !plan.product.parentId);
      if (parentPlan) {
        try { accept(parentPlan, await updateProduct(parentPlan)); }
        catch (saveError) {
          rowErrors[parentPlan.product.id] = saveError instanceof Error ? saveError.message : "Unable to save parent.";
          throw new Error(`Parent V1: ${rowErrors[parentPlan.product.id]}`);
        }
      }
      const remaining = plans.filter((plan) => plan !== parentPlan);
      for (let start = 0; start < remaining.length; start += 6) {
        const batch = remaining.slice(start, start + 6);
        const results = await Promise.allSettled(batch.map(updateProduct));
        results.forEach((result, index) => {
          const plan = batch[index];
          if (result.status === "fulfilled") accept(plan, result.value);
          else {
            rowErrors[plan.product.id] = result.reason instanceof Error ? result.reason.message : "Unable to save row.";
            if (!plan.direct) {
              // Keep failed inherited changes visible and dirty so Save all
              // can retry them after the parent itself has already saved.
              const previous = nextRows.find((row) => row.id === plan.product.id) ?? plan.product;
              nextForms[previous.id] = mergeProductEditorSave(previous, nextForms[previous.id], { ...previous, ...plan.payload } as Product, false);
            }
          }
        });
      }
      const failedCount = Object.keys(rowErrors).length;
      if (failedCount) setError(`${savedCount} rows saved. ${failedCount} rows could not be saved; check the row errors and try again.`);
      else setMessage(`${savedCount} ${savedCount === 1 ? "row" : "rows"} saved successfully.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save product changes.");
    } finally {
      setRows(nextRows);
      setForms(nextForms);
      setErrors(rowErrors);
      if (lastSaved) {
        try { await onSaved(lastSaved, true); }
        catch { setError("Your rows were saved, but the catalog could not refresh. Close the table and refresh the catalog."); }
      }
      setSavingIds(new Set());
      setSaving(false);
      busy.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4">
      <button type="button" onClick={requestClose} disabled={saving} aria-label="Close product table" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="product-editor-title" tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.stopPropagation(); requestClose(); }
          if (event.key === "Tab") {
            const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
            if (!controls?.length) return;
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}
        className="relative flex h-[94vh] min-h-0 w-full max-w-[1800px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none"
      >
        <header className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="product-editor-title" className="text-xl font-bold text-slate-950">Edit products</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{rows.length} {rows.length === 1 ? "record" : "records"}</span>
              </div>
              <p className="mt-1 truncate text-sm text-slate-500">Design {forms[parent?.id ?? product.id]?.designNumber} · {parent?.productName ?? product.productName}</p>
            </div>
            <button type="button" onClick={requestClose} disabled={saving} aria-label="Close product editor" className={`${BUTTON} p-2.5`}><X size={18} /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Edit cells directly. Scroll horizontally for all fields, then save a row or all changes.</p>
            <label className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input type="search" aria-label="Search product rows" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, SKU, model or version" className={`${CELL_INPUT} pl-9`} />
            </label>
          </div>
        </header>

        {(error || message) && <div aria-live="polite" role={error ? "alert" : "status"} className={`shrink-0 border-b px-4 py-3 text-sm sm:px-6 ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || message}</div>}

        <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain" aria-label="Editable product table">
          <table className="w-max min-w-full border-separate border-spacing-0 text-left text-xs">
            <caption className="sr-only">Editable parent and variant records. One product per row.</caption>
            <thead className="sticky top-0 z-40 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th scope="col" className="sticky left-0 z-50 w-20 min-w-20 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 sm:w-24 sm:min-w-24">Version</th>
                <th scope="col" className="z-50 w-[220px] min-w-[220px] border-b border-r border-slate-200 bg-slate-100 px-3 py-3 shadow-[4px_0_8px_-6px_#64748b] sm:sticky sm:left-24 sm:w-[300px] sm:min-w-[300px]">Product Name</th>
                {FIELDS.map((field) => <th key={field.key} scope="col" className={`border-b border-r border-slate-200 px-3 py-3 ${field.width ?? (field.number ? "w-[130px] min-w-[130px]" : "w-[180px] min-w-[180px]")}`}>{field.label}</th>)}
                <th scope="col" className="z-50 w-[150px] min-w-[150px] border-b border-l border-slate-200 bg-slate-100 px-3 py-3 text-right sm:sticky sm:right-0">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const form = forms[row.id];
                const dirty = dirtyIds.has(row.id);
                const rowError = errors[row.id];
                const highlighted = row.id === product.id;
                const background = highlighted ? "bg-blue-50" : "bg-white";
                return (
                  <tr key={row.id} ref={highlighted ? initialRowRef : undefined} className={`align-top ${background}`}>
                    <th scope="row" className={`sticky left-0 z-20 border-b border-r border-slate-200 px-3 py-3 ${background}`}>
                      <span className={`inline-flex rounded-full px-2 py-1 font-bold ${row.parentId ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-700"}`}>V{productEditorVersion(row)}</span>
                      <span className="mt-2 block text-[10px] font-medium text-slate-500">{row.parentId ? "Variant" : "Parent"}</span>
                    </th>
                    <td className={`z-20 border-b border-r border-slate-200 p-2 shadow-[4px_0_8px_-6px_#64748b] sm:sticky sm:left-24 ${background}`}>
                      <textarea rows={3} aria-label={`Product Name for V${productEditorVersion(row)}`} value={form.productName} onChange={(event) => changeField(row.id, "productName", event.target.value)} disabled={saving} className={CELL_TEXTAREA} />
                    </td>
                    {FIELDS.map((field) => (
                      <td key={field.key} className="border-b border-r border-slate-200 p-2">
                        <ProductTableInput field={field} row={row} form={form} saving={saving} designs={designs} designsLoading={designsLoading}
                          onLoadDesigns={loadDesigns} onChange={(value) => changeField(row.id, field.key, value)}
                          onImageSetChange={(slot, url) => changeField(row.id, slot, url)}
                          onSelectDesign={(id) => {
                            const design = designs.find((option) => option.id === id);
                            if (design) setForms((current) => ({ ...current, [row.id]: { ...current[row.id], designId: design.id, designName: design.designName, designCode: design.designCode } }));
                          }} />
                      </td>
                    ))}
                    <td className={`z-20 border-b border-l border-slate-200 px-3 py-3 sm:sticky sm:right-0 ${background}`}>
                      <span className={`mb-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${rowError ? "bg-red-100 text-red-700" : dirty ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {!dirty && !rowError && <Check size={10} />}{rowError ? "Save failed" : dirty ? "Unsaved" : "Up to date"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => void saveRows([row.id])} disabled={saving || !dirty} aria-label={`Save V${productEditorVersion(row)} changes`} className={`${BUTTON} border-blue-200 text-blue-700`}>
                          {savingIds.has(row.id) ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}Save
                        </button>
                        <button type="button" onClick={() => resetRow(row)} disabled={saving || !dirty} title="Reset unsaved row changes" aria-label={`Reset V${productEditorVersion(row)} changes`} className={`${BUTTON} px-2`}><RotateCcw size={13} /></button>
                      </div>
                      {rowError && <p role="alert" className="mt-3 max-w-32 break-words text-[11px] text-red-600">{rowError}</p>}
                    </td>
                  </tr>
                );
              })}
              {!visibleRows.length && <tr><td colSpan={FIELDS.length + 3} className="p-8 text-slate-500">No matching product rows.</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="text-xs text-slate-500">
              <p>{dirtyRows.length ? `${dirtyRows.length} ${dirtyRows.length === 1 ? "row has" : "rows have"} unsaved changes` : "All rows are up to date"}</p>
              {parent && standardVariants.length > 0 && (
                <label className="mt-2 flex items-start gap-2">
                  <input type="checkbox" checked={applySharedFields} disabled={saving} onChange={(event) => setApplySharedFields(event.target.checked)} className="mt-0.5 accent-blue-600" />
                  <span>Apply parent catalog fields to all {standardVariants.length} standard variants when saving the parent.
                    <span className="mt-0.5 block text-[11px] text-slate-400">Parent price and brand changes keep the existing variant update behavior. Individual table edits take priority when saving all.</span>
                  </span>
                </label>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-2">
              <button type="button" onClick={requestClose} disabled={saving} className={`${BUTTON} h-11 px-5 text-sm`}>{hasSaved ? "Close" : "Cancel"}</button>
              <button type="button" onClick={() => void saveRows(dirtyRows.map((row) => row.id))} disabled={saving || !dirtyRows.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Saving…" : "Save all changes"}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ProductTableInput({ field, row, form, saving, designs, designsLoading, onLoadDesigns, onChange, onSelectDesign, onImageSetChange }: {
  field: TableField; row: Product; form: ProductEditorForm; saving: boolean;
  designs: DesignOption[]; designsLoading: boolean; onLoadDesigns: () => Promise<void>;
  onChange: (value: string) => void; onSelectDesign: (id: string) => void;
  onImageSetChange: (field: MeeshoImageField, url: string) => void;
}) {
  const value = form[field.key];
  const inherited = Boolean(field.inherited && row.parentId);
  const linkedDesign = (field.key === "designName" || field.key === "designCode") && Boolean(form.designId);
  const disabled = saving || inherited || linkedDesign;
  const label = `${field.label} for V${productEditorVersion(row)}`;
  if (field.key === "designId") {
    return <div>
      <select aria-label={label} value={value} disabled={saving || inherited} onFocus={() => void onLoadDesigns()} onChange={(event) => onSelectDesign(event.target.value)} className={CELL_INPUT}>
        <option value={value}>{form.designName || "Current manual design"}{form.designCode ? ` — ${form.designCode}` : ""}</option>
        {designs.filter((design) => design.id !== value).map((design) => <option key={design.id} value={design.id}>{design.designName} — {design.designCode}</option>)}
      </select>
      <p className="mt-1 text-[10px] text-slate-400">{inherited ? "Inherited from V1 parent" : designsLoading ? "Loading saved designs…" : "Selecting a design updates its name and code."}</p>
    </div>;
  }
  if (field.options) {
    const options = value && !field.options.includes(value) ? [value, ...field.options] : field.options;
    return <select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={CELL_INPUT}>
      {!value && <option value="">Select {field.label}</option>}
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>;
  }
  return <div>
    {field.image && <div className="mb-2 flex h-12 items-center gap-2 text-slate-400">
      {value ? <img src={value} alt={`${field.label} for V${productEditorVersion(row)}`} loading="lazy" className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain" /> : <ImageIcon size={20} />}
    </div>}
    {field.multiline ? <textarea rows={3} value={value} disabled={disabled} aria-label={label} placeholder={field.key === "models" ? "One phone model per line" : undefined} onChange={(event) => onChange(event.target.value)} className={CELL_TEXTAREA} />
      : <input type={field.number ? "number" : "text"} value={value} disabled={disabled} aria-label={label} min={field.number ? 0 : undefined} max={field.key === "wrongDefectiveReturnsPrice" ? 30 : undefined} step={field.number ? "any" : undefined} onChange={(event) => onChange(event.target.value)} className={CELL_INPUT} />}
    {field.key === "image1" && <MeeshoImageSetUpload rowId={row.id} values={form} onChange={onImageSetChange} disabled={disabled} compact />}
    {field.image && <MeeshoImageUpload target={{ rowId: row.id, field: field.key as MeeshoImageField }} value={value} onChange={onChange} disabled={disabled} />}
    {(inherited || linkedDesign) && <p className="mt-1 text-[10px] text-slate-400">{inherited ? "Inherited from V1 parent" : "Set by the saved design"}</p>}
  </div>;
}
