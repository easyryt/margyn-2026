import type { GeneralProductListing } from "./general-product-excel";

export type GeneralProductColumn = {
  field: Exclude<keyof GeneralProductListing, "id">;
  label: string;
  numeric?: boolean;
};

// Supported seller fields in the shared public/listing-tool/meesho-template.xlsx column order.
// Phone-only Compatible Models and dimensions are not shown in general-product review.
export const GENERAL_PRODUCT_TEMPLATE_COLUMNS: GeneralProductColumn[] = [
  { field: "productName", label: "Product Name" },
  { field: "variation", label: "Variation" },
  { field: "price", label: "Meesho Price", numeric: true },
  { field: "wrongDefectiveReturnsPrice", label: "Wrong/Defective Returns Price", numeric: true },
  { field: "mrp", label: "MRP", numeric: true },
  { field: "gst", label: "GST %", numeric: true },
  { field: "hsn", label: "HSN ID" },
  { field: "weight", label: "Net Weight (gms)", numeric: true },
  { field: "inventory", label: "Inventory", numeric: true },
  { field: "country", label: "Country of Origin" },
  { field: "manufacturer", label: "Manufacturer Name" },
  { field: "manufacturerAddress", label: "Manufacturer Address" },
  { field: "manufacturerPincode", label: "Manufacturer Pincode" },
  { field: "packer", label: "Packer Name" },
  { field: "packerAddress", label: "Packer Address" },
  { field: "packerPincode", label: "Packer Pincode" },
  { field: "importer", label: "Importer Name" },
  { field: "importerAddress", label: "Importer Address" },
  { field: "importerPincode", label: "Importer Pincode" },
  { field: "color", label: "Color" },
  { field: "genericName", label: "Generic Name" },
  { field: "material", label: "Material" },
  { field: "quantity", label: "Net Quantity (N)", numeric: true },
  { field: "theme", label: "Theme" },
  { field: "productType", label: "Type" },
  { field: "image1", label: "Image 1 (Front)" },
  { field: "image2", label: "Image 2" },
  { field: "image3", label: "Image 3" },
  { field: "image4", label: "Image 4" },
  { field: "styleId", label: "Product ID / Style ID" },
  { field: "sku", label: "SKU ID" },
  { field: "brand", label: "Brand Name" },
  { field: "groupId", label: "Group ID" },
  { field: "description", label: "Product Description" },
];

const ADDITIONAL_COLUMNS: GeneralProductColumn[] = [
  { field: "includedComponents", label: "Included Components" },
  { field: "length", label: "Length" }, { field: "width", label: "Width" },
];
const ALIASES: Partial<Record<GeneralProductColumn["field"], string[]>> = {
  wrongDefectiveReturnsPrice: ["wrong defective returns price"], gst: ["gst"], hsn: ["hsn"],
  weight: ["net weight"], quantity: ["net quantity"], image1: ["image 1"],
  styleId: ["style id"], sku: ["seller sku id"], brand: ["brand"],
  productType: ["product type"], length: ["product length"], width: ["product width"],
};

export function generalProductColumnForHeader(value: string): GeneralProductColumn | undefined {
  const label = value.split(/\r?\n/).find((line) => line.trim())?.replace(/\s+/g, " ").trim() || "";
  const header = label.toLowerCase().replace(/\s*\(/g, " (");
  const definition = [...GENERAL_PRODUCT_TEMPLATE_COLUMNS, ...ADDITIONAL_COLUMNS].find((column) =>
    [column.label.toLowerCase(), ...(ALIASES[column.field] || [])].some((alias) =>
      header === alias || header.startsWith(`${alias} (`),
    ),
  );
  return definition ? { ...definition, label } : undefined;
}

export function generalProductPreviewColumns(columns: GeneralProductColumn[]) {
  return columns.filter(({ field }) => field !== "length" && field !== "width");
}
