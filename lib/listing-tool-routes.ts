export const LISTING_ROOT = "/tools/listing-tool";
export const LISTING_TABS = [
  { path: "", label: "Start", icon: "grid" },
  { path: "/products", label: "Phone covers", icon: "layers" },
  { path: "/general-products", label: "General products", icon: "box" },
  { path: "/charms/batch", label: "Charms", icon: "spark" },
] as const;
export function validListingSegments(parts: string[]) {
  if (!parts.length) return true;
  if (parts.some(part => !part || part.length > 160 || /[\\/\u0000-\u001f]/.test(part) || part === "." || part === "..")) return false;
  if (parts.length === 1) return ["products", "create-product", "general-products", "create-general-product", "analytics", "import"].includes(parts[0]);
  if (parts.length === 2) return (parts[0] === "charms" && (parts[1] === "batch" || /^\d+(?:\.\d+)?$/.test(parts[1]))) || (parts[0] === "general-products" && /^[a-f0-9]{24}$/i.test(parts[1]));
  return parts.length === 3 && ((parts[0] === "products" && parts[1] === "model") || (parts[0] === "general-products" && parts[1] === "category"));
}
function allowedQuery(parts: string[], key: string, value: string) {
  if (value.length > 160 || /[\\\u0000-\u001f]/.test(value)) return false;
  if (key === "productId") return (parts[0] === "create-general-product" || parts[0] === "charms") && /^[a-f0-9]{24}$/i.test(value);
  if (key === "step") return parts[0] === "create-general-product" && ["variants", "edit"].includes(value);
  if (key === "category") return parts[0] === "general-products";
  if (key === "listing") return parts[0] === "general-products" && parts.length === 2 && !!value;
  return false;
}
export function listingReturnPath(parts: string[], query: Record<string, string | string[] | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (typeof value === "string" && allowedQuery(parts, key, value)) params.set(key, value);
  return LISTING_ROOT + (parts.length ? "/" + parts.map(encodeURIComponent).join("/") : "") + (params.size ? "?" + params : "");
}
export function safeListingReturn(value: string) {
  if (!value.startsWith(LISTING_ROOT + "/") || /[#\\\u0000-\u001f]/.test(value)) return false;
  try {
    const [pathname, search = ""] = value.split("?");
    const parts = pathname.slice(LISTING_ROOT.length + 1).split("/").map(decodeURIComponent);
    const params = new URLSearchParams(search);
    if (!validListingSegments(parts) || [...params].some(([key, item]) => params.getAll(key).length !== 1 || !allowedQuery(parts, key, item))) return false;
    return listingReturnPath(parts, Object.fromEntries(params)) === value;
  } catch { return false; }
}
