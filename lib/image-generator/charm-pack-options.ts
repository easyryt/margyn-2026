export const PACK_MIN_PIECES = 1;
export const PACK_MAX_PIECES = 20;
export const PACK_VIEWS = [
  { id: "pack-fan", label: "Fanned product view", reference: "/templates/charm-pack-fan-reference.jpeg" },
  { id: "pack-palm", label: "Open palm view", reference: "/templates/charm-pack-palm-reference.jpeg" },
] as const;
export type PackViewId = (typeof PACK_VIEWS)[number]["id"];
export type PackViewFailure = { viewId: PackViewId; label: string; message: string };

export function parsePackQuantity(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d?$/.test(value)) return null;
  const quantity = Number(value);
  return quantity >= PACK_MIN_PIECES && quantity <= PACK_MAX_PIECES ? quantity : null;
}

export function isPackViewId(value: unknown): value is PackViewId {
  return PACK_VIEWS.some((view) => view.id === value);
}

export function packQuantityLabel(quantity: number) {
  return `${quantity} ${quantity === 1 ? "Pc" : "Pcs"}`;
}
