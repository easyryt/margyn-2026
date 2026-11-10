import type { GeneralProductColumn } from "./general-product-columns";

export const GENERAL_PRODUCT_IMAGE_FIELDS = ["image1", "image2", "image3", "image4"] as const;
export type GeneralProductImageField = typeof GENERAL_PRODUCT_IMAGE_FIELDS[number];

const PRICING_FIELDS = ["price", "wrongDefectiveReturnsPrice", "mrp", "gst", "hsn", "weight", "inventory"];
const SUPPLIER_FIELDS = ["country", "manufacturer", "manufacturerAddress", "manufacturerPincode", "packer", "packerAddress", "packerPincode", "importer", "importerAddress", "importerPincode"];

export const GENERAL_PRODUCT_REVIEW_VIEWS = [
  { id: "quick", label: "Quick review", description: "Check titles, prices, stock and SKUs. Select Edit row to fill every field for one listing." },
  { id: "pricing", label: "Pricing & stock", description: "Compare prices and inventory side by side. Changes are kept in your local batch until you save." },
  { id: "images", label: "Images", description: "Paste image links and check the previews. Click any image to enlarge it." },
  { id: "details", label: "Listing details", description: "Review pack contents, editable IDs and descriptions. SKU and Style ID stay matched." },
  { id: "supplier", label: "Supplier details", description: "Review manufacturer, packer and importer fields before exporting." },
  { id: "all", label: "All Excel fields", description: "All listing fields in your template order. Group IDs are automatic; length and width stay hidden." },
] as const;
export type GeneralProductReviewView = typeof GENERAL_PRODUCT_REVIEW_VIEWS[number]["id"];

export function isGeneralProductImageField(field: string): field is GeneralProductImageField {
  return (GENERAL_PRODUCT_IMAGE_FIELDS as readonly string[]).includes(field);
}

export function generalProductReviewColumns(columns: GeneralProductColumn[], view: GeneralProductReviewView) {
  const visible = columns.filter(({ field }) => field !== "length" && field !== "width");
  if (view === "all") return visible;
  const fields = view === "quick" ? ["productName", "price", "inventory", "quantity", "sku", "groupId"]
    : view === "pricing" ? ["productName", ...PRICING_FIELDS]
      : view === "images" ? ["productName", ...GENERAL_PRODUCT_IMAGE_FIELDS]
        : view === "supplier" ? ["productName", ...SUPPLIER_FIELDS]
          : visible.filter(({ field }) => !PRICING_FIELDS.includes(field) && !SUPPLIER_FIELDS.includes(field) && !isGeneralProductImageField(field)).map(({ field }) => field);
  return visible.filter(({ field }) => fields.includes(field));
}

export function generalProductReviewSections(columns: GeneralProductColumn[]) {
  const visible = generalProductReviewColumns(columns, "all");
  return [
    { title: "Title & listing details", columns: visible.filter(({ field }) => !PRICING_FIELDS.includes(field) && !SUPPLIER_FIELDS.includes(field) && !isGeneralProductImageField(field)) },
    { title: "Pricing & stock", columns: visible.filter(({ field }) => PRICING_FIELDS.includes(field)) },
    { title: "Product images", columns: visible.filter(({ field }) => isGeneralProductImageField(field)) },
    { title: "Manufacturer, packer & importer", columns: visible.filter(({ field }) => SUPPLIER_FIELDS.includes(field)) },
  ].filter((section) => section.columns.length);
}

// Preview only browser-safe, absolute web URLs. No server-side image fetching is needed.
export function generalProductImageSource(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}
