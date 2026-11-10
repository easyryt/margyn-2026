import { charmVariantNumber, isParentCharm } from "./charm-order";
import type { VariantImageRow } from "./meesho-variant-images";

type SavedImageRecord = {
  id: string;
  productName?: string;
  parentId?: string;
  variantNumber?: unknown;
  version?: unknown;
  sku?: string;
  sourceKind?: "parent" | "variant";
  sourceVariantNumber?: unknown;
  image1?: string;
  image2?: string;
  image3?: string;
  image4?: string;
};
export type PendingVariantMainImages = Record<string, { url: string; initialValue: string }>;
export type VariantMainImageChange = { rowId: string; version: number; payload: { image1: string } };

export function withSavedVariantMainImage<T extends { image1: string; image?: string }>(row: T, image1: string): T {
  return { ...row, image1, image: image1 };
}

function positiveVersion(value: unknown) {
  const match = String(value ?? "").trim().match(/^V?(\d+)$/i);
  const version = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(version) && version > 0 ? version : undefined;
}

export function savedVariantImageRows(records: readonly SavedImageRecord[], kind: "product" | "charm"): VariantImageRow[] {
  return records.flatMap(row => {
    if (kind === "product" ? !row.parentId : isParentCharm(row)) return [];
    const version = kind === "charm" ? charmVariantNumber(row) :
      positiveVersion(row.variantNumber) ?? positiveVersion(row.version) ?? positiveVersion(row.sku?.match(/(?:^|[.-])V(\d+)$/i)?.[1]);
    if (!version || version < 2) return [];
    return [{ rowId: row.id, version, title: row.productName || row.sku || `V${version}`,
      image1: row.image1 || "", image2: row.image2 || "", image3: row.image3 || "", image4: row.image4 || "" }];
  }).sort((a, b) => a.version - b.version);
}

export function pendingVariantMainImageChanges(rows: readonly VariantImageRow[], pending: PendingVariantMainImages): VariantMainImageChange[] {
  return Object.entries(pending).flatMap(([rowId, change]) => {
    const row = rows.find(value => value.rowId === rowId);
    if (!row || row.version < 2) throw new Error("A target variant is no longer available. Refresh and check the assignments before saving.");
    if (row.image1 === change.url) return [];
    if (row.image1 !== change.initialValue) throw new Error(`V${row.version}'s main image was edited elsewhere on this page. Review that edit before saving.`);
    return [{ rowId, version: row.version, payload: { image1: change.url } }];
  });
}

export async function saveVariantMainImages(changes: readonly VariantMainImageChange[], save: (rowId: string, payload: { image1: string }) => Promise<void>) {
  const saved: string[] = [], errors: string[] = [];
  for (const change of changes) {
    try {
      // Construct the payload here as well: no title, SKU or supporting field can leak into a bulk image save.
      await save(change.rowId, { image1: change.payload.image1 });
      saved.push(change.rowId);
    } catch (error) { errors.push(`V${change.version}: ${error instanceof Error ? error.message : "Unable to save its main image."}`); }
  }
  return { saved, errors };
}
