export const CHARM_VIEW_IDS = ["hand-closeup", "charm-product-flatlay", "charm-only"] as const;
export type CharmViewId = (typeof CHARM_VIEW_IDS)[number];
export type CharmViewFailure = { viewId: CharmViewId; label: string; message: string };

export function isCharmViewId(value: unknown): value is CharmViewId {
  return value === "hand-closeup" || value === "charm-product-flatlay" || value === "charm-only";
}
