export const INVENTORY_ROOT = "/tools/inventory-admin";
export const INVENTORY_PRIMARY_SECTIONS = [
  { path: "", label: "Start", icon: "grid" },
  { path: "/inventory", label: "Inventory", icon: "layers" },
  { path: "/printing-jobs", label: "Print jobs", icon: "edit" },
  { path: "/purchase-orders", label: "Purchases", icon: "truck" },
] as const;
export const INVENTORY_OTHER_SECTIONS = [
  { path: "/inventory/low-stock", label: "Low stock", icon: "layers" },
  { path: "/barcode-report", label: "Packed items", icon: "box" },
  { path: "/products", label: "Products", icon: "box" },
  { path: "/categories", label: "Categories", icon: "grid" },
  { path: "/product-designs", label: "Designs", icon: "spark" },
  { path: "/imagekit-images", label: "Image library", icon: "spark" },
  { path: "/create-user", label: "Staff", icon: "user" },
] as const;
export const INVENTORY_SECTIONS = [...INVENTORY_PRIMARY_SECTIONS, ...INVENTORY_OTHER_SECTIONS];

export function validInventorySegments(parts: string[]) {
  if (!parts.length) return true;
  if (parts.length === 1) return INVENTORY_SECTIONS.some(section => section.path === "/" + parts[0]);
  return parts.length === 2 && ((parts[0] === "inventory" && parts[1] === "low-stock") || (["inventory", "barcodes"].includes(parts[0]) && /^[a-f0-9]{24}$/i.test(parts[1])));
}
export function inventoryReturnPath(parts: string[], query: Record<string, string | string[] | undefined> = {}) {
  const params = new URLSearchParams();
  if (parts.length === 1 && parts[0] === "inventory" && typeof query.product === "string" && /^[a-f0-9]{24}$/i.test(query.product)) params.set("product", query.product);
  return INVENTORY_ROOT + (parts.length ? "/" + parts.map(encodeURIComponent).join("/") : "") + (params.size ? "?" + params : "");
}
export function safeInventoryReturn(value: string) {
  if (!value.startsWith(INVENTORY_ROOT + "/") || /[#\\\u0000-\u001f]/.test(value)) return false;
  try {
    const [pathname, query = ""] = value.split("?");
    const parts = pathname.slice(INVENTORY_ROOT.length + 1).split("/").map(decodeURIComponent);
    const params = new URLSearchParams(query);
    if (!validInventorySegments(parts) || [...params].some(([key]) => params.getAll(key).length !== 1)) return false;
    return inventoryReturnPath(parts, Object.fromEntries(params)) === value;
  } catch { return false; }
}
