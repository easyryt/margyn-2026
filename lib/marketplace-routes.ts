export const MARKETPLACE_ROOT = "/tools/marketplace";
const filterKeys = ["q", "category", "min", "max", "size", "spec", "pack", "vendor", "stock", "verified", "sort"];
export function marketplaceReturnPath(query: Record<string, string | string[] | undefined> = {}) {
  const params = new URLSearchParams();
  for (const key of filterKeys) {
    const value = query[key];
    for (const item of Array.isArray(value) ? value : value ? [value] : []) {
      if (item.length <= 300) params.append(key, item);
    }
  }
  return MARKETPLACE_ROOT + (params.size ? "?" + params : "");
}
export function safeMarketplaceReturn(value: string) {
  if (value.length > 4000 || /[#\\\u0000-\u001f]/.test(value)) return false;
  try {
    const url = new URL(value, "http://margyn.local");
    return value.startsWith(MARKETPLACE_ROOT) && url.origin === "http://margyn.local" && url.pathname === MARKETPLACE_ROOT && [...url.searchParams].every(([key, item]) => filterKeys.includes(key) && item.length <= 300);
  } catch { return false; }
}
