import type { GeneralProductListing } from "./general-product-excel";
import { createGeneralProductSku, normalizeGeneralProductSku, generalProductSkuError, selectedProductTitle, selectionError, type GeneralProductSkuCodes } from "./general-product-listing";

export type GeneralProductVariant = {
  id: string;
  productName: string;
  version: number;
  groupId?: string;
  skuOverride?: string | null;
  overrides?: Partial<Omit<GeneralProductListing, "id" | "sku" | "styleId" | "productName" | "groupId">>;
};

export type GeneralProductBatchItem = {
  draft: GeneralProductListing;
  codes: GeneralProductSkuCodes;
  variants: GeneralProductVariant[];
  parentVersion: number;
  productContext: string;
  skuOverride?: string | null;
  databaseId?: string;
  databaseRevision?: number;
  createdAt?: string;
  updatedAt?: string;
};

export function generalProductBatchRows(item: GeneralProductBatchItem): GeneralProductListing[] {
  const sku = typeof item.skuOverride === "string" ? normalizeGeneralProductSku(item.skuOverride)
    : createGeneralProductSku(item.codes, item.draft.quantity, item.parentVersion);
  const groups = generalProductListingGroups(item);
  const parent = { ...item.draft, groupId: groups[0], sku, styleId: sku };
  return [parent, ...item.variants.map((variant, index) => {
    const row = { ...parent, ...variant.overrides, id: variant.id, productName: variant.productName };
    const variantSku = typeof variant.skuOverride === "string" ? normalizeGeneralProductSku(variant.skuOverride)
      : createGeneralProductSku(item.codes, row.quantity, variant.version);
    return { ...row, groupId: groups[index + 1], sku: variantSku, styleId: variantSku };
  })];
}

export function withGeneralProductSku(item: GeneralProductBatchItem, rowId: string, value: string | null): GeneralProductBatchItem {
  const skuOverride = value === null ? null : normalizeGeneralProductSku(value);
  return rowId === item.draft.id ? { ...item, skuOverride }
    : { ...item, variants: item.variants.map((variant) => variant.id === rowId ? { ...variant, skuOverride } : variant) };
}

export function nextGeneralProductVersion(batch: GeneralProductBatchItem[], codes: GeneralProductSkuCodes, quantity: string) {
  const prefix = createGeneralProductSku(codes, quantity).replace(/V1$/, "");
  const versions = batch.flatMap((item) => generalProductBatchRows(item).flatMap((row, index) => {
    const originalPrefix = createGeneralProductSku(item.codes, row.quantity).replace(/V1$/, "");
    const version = index === 0 ? item.parentVersion : item.variants[index - 1].version;
    return [originalPrefix === prefix ? version : 0,
      row.sku.toUpperCase().startsWith(prefix.toUpperCase()) ? Number(row.sku.match(/-V(\d+)(?:\.D)?$/i)?.[1] || 0) : 0];
  }));
  return Math.max(0, ...versions) + 1;
}

export function generalProductGroupId(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:Group\s+)?(\d+)$/i);
  return match ? String(Number(match[1])) : trimmed;
}

export function nextGeneralProductGroup(batch: GeneralProductBatchItem[]) {
  const groups = batch.flatMap(generalProductBatchRows).map((row) => Number(row.groupId))
    .filter((group) => Number.isSafeInteger(group) && group > 0);
  return String(Math.max(0, ...groups) + 1);
}

export const GENERAL_PRODUCT_VARIANT_LIMIT = 500;

export function generalProductListingGroups(item: Pick<GeneralProductBatchItem, "draft" | "variants">) {
  const read = (value = "") => {
    const match = value.trim().match(/^(?:Group\s+)?(\d+)$/i);
    const numeric = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
  };
  const parent = read(item.draft.groupId) || 1;
  const reserved = new Set([parent, ...item.variants.map((variant) => read(variant.groupId)).filter(Boolean)]);
  const used = new Set([parent]);
  let next = parent + 1;
  return [String(parent), ...item.variants.map((variant) => {
    let group = read(variant.groupId);
    if (!group || used.has(group)) {
      while (reserved.has(next) || used.has(next)) next += 1;
      group = next++;
    }
    used.add(group);
    return String(group);
  })];
}

export function withGeneralProductListingGroups(item: GeneralProductBatchItem): GeneralProductBatchItem {
  const groups = generalProductListingGroups(item);
  return { ...item, draft: { ...item.draft, groupId: groups[0] },
    variants: item.variants.map((variant, index) => ({ ...variant, groupId: groups[index + 1] })) };
}

export function appendGeneralProductVariants({ item, titles, batch, occupiedProducts = [], createId }: {
  item: GeneralProductBatchItem;
  titles: string[];
  batch: GeneralProductBatchItem[];
  occupiedProducts?: GeneralProductBatchItem[];
  createId: () => string;
}): GeneralProductBatchItem {
  if (!titles.length || titles.length > 50) throw new Error("Create between 1 and 50 additional variants at a time.");
  if (item.variants.length + titles.length > GENERAL_PRODUCT_VARIANT_LIMIT) {
    throw new Error(`A product supports up to ${GENERAL_PRODUCT_VARIANT_LIMIT} variants. ${GENERAL_PRODUCT_VARIANT_LIMIT - item.variants.length} spaces remain.`);
  }
  const existing = withGeneralProductListingGroups(item);
  const otherProducts = batch.filter((product) => product.draft.id !== item.draft.id);
  const firstVersion = nextGeneralProductVersion([...otherProducts, ...occupiedProducts, existing], item.codes, item.draft.quantity);
  const firstGroup = Number(nextGeneralProductGroup([...otherProducts, existing]));
  const usedTitles = new Set([item.draft.productName, ...item.variants.map((variant) => variant.productName)].map((title) => title.toLowerCase().trim()));
  const added = titles.map((title, index) => {
    const productName = selectedProductTitle(title, item.draft);
    if (!productName || usedTitles.has(productName.toLowerCase())) throw new Error("Each additional variant needs a unique title matching its product type and pack quantity.");
    usedTitles.add(productName.toLowerCase());
    return { id: createId(), productName, version: firstVersion + index, groupId: String(firstGroup + index) };
  });
  const result = { ...existing, variants: [...existing.variants, ...added] };
  const invalid = generalProductBatchError(generalProductBatchRows(result));
  if (invalid) throw new Error(invalid);
  return result;
}

export function generalProductExportCategoryError(rows: GeneralProductListing[]) {
  const categories = new Set(rows.map((row) => row.category.trim().toLowerCase()));
  if (categories.size > 1) return "A marketplace workbook supports one category. Keep each category in a separate export batch.";
  return "";
}

export function generalProductBatchError(rows: GeneralProductListing[]) {
  if (!rows.length) return "Add at least one product to the batch first.";
  const skus = new Set<string>();
  for (const row of rows) {
    const missing = selectionError(row);
    if (missing) return `${row.sku || "Product"}: ${missing}`;
    if (!selectedProductTitle(row.productName, row)) return `${row.sku}: Title must include ${row.productType} and end with (Pack of ${Number(row.quantity)}).`;
    if (!row.sku || row.sku !== row.styleId) return "Each product must have matching Style ID and SKU ID.";
    const invalidSku = generalProductSkuError(row.sku);
    if (invalidSku) return invalidSku;
    try {
      if (new URL(row.image1).protocol !== "https:") return `${row.sku}: Provide a hosted HTTPS product image URL.`;
    } catch { return `${row.sku}: Provide a hosted HTTPS product image URL.`; }
    if (skus.has(row.sku)) return `Duplicate SKU ${row.sku}. Each listing needs a unique SKU; edit it before saving or exporting.`;
    skus.add(row.sku);
    for (const field of ["price", "wrongDefectiveReturnsPrice", "mrp", "weight", "inventory", "gst"] as const) {
      if (!row[field].trim() || !Number.isFinite(Number(row[field])) || Number(row[field]) < 0) return `${row.sku}: Enter a valid ${field}.`;
    }
    if (Number(row.price) > Number(row.mrp)) return `${row.sku}: Price cannot exceed MRP.`;
    if (Number(row.wrongDefectiveReturnsPrice) > Number(row.price)) return `${row.sku}: Wrong/defective returns price cannot exceed Meesho price.`;
  }
  return "";
}
