import { generalProductBatchRows } from "./general-product-batch";
import type { GeneralProductListing } from "./general-product-excel";
import type { SavedGeneralProduct } from "./general-products-api";

export type GeneralProductCatalogResponse = {
  products: SavedGeneralProduct[];
  pagination: { page: number; limit: number; total: number; pages: number };
};
export const listingNumber = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
export const listingMoney = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
export const categoryHref = (category: string) => `/general-products/category/${encodeURIComponent(category)}`;
export const generalProductAddVariantsHref = (productId: string) => `/create-general-product?productId=${encodeURIComponent(productId)}&step=variants`;

export function generalProductCategoryFromPath(segment: string) {
  try { return decodeURIComponent(segment).trim(); } catch { return segment.trim(); }
}

export type GeneralProductCatalogFamily = {
  product: SavedGeneralProduct;
  parent: GeneralProductListing;
  parentInCategory: boolean;
  rows: GeneralProductListing[];
  variants: Array<{ row: GeneralProductListing; version: number }>;
};

export type GeneralProductCatalogSummary = {
  families: number; parents: number; variants: number; records: number;
  inventory: number; value: number; lowStock: number; outOfStock: number;
};

export function generalProductStockStatus(inventory: string | number) {
  const stock = Number(inventory);
  return stock <= 0 ? "out-of-stock" : stock <= 10 ? "low-stock" : "in-stock";
}

export function generalProductCatalogFamilies(products: SavedGeneralProduct[], category = ""): GeneralProductCatalogFamily[] {
  return products.map((product) => {
    const rows = generalProductBatchRows(product);
    const inCategory = (row: GeneralProductListing) => !category || row.category.trim() === category.trim();
    return {
      product, parent: rows[0], parentInCategory: inCategory(rows[0]), rows: rows.filter(inCategory),
      variants: product.variants.map((variant, index) => ({ row: rows[index + 1], version: variant.version })).filter(({ row }) => inCategory(row)),
    };
  }).filter((family) => family.rows.length > 0);
}

export function summarizeGeneralProductCatalog(families: GeneralProductCatalogFamily[]): GeneralProductCatalogSummary {
  const summary: GeneralProductCatalogSummary = { families: families.length, parents: 0, variants: 0, records: 0, inventory: 0, value: 0, lowStock: 0, outOfStock: 0 };
  for (const family of families) {
    summary.parents += Number(family.parentInCategory);
    summary.variants += family.variants.length;
    for (const row of family.rows) {
      summary.records += 1;
      summary.inventory += Number(row.inventory);
      summary.value += Number(row.inventory) * Number(row.price);
      const status = generalProductStockStatus(row.inventory);
      summary.lowStock += Number(status === "low-stock");
      summary.outOfStock += Number(status === "out-of-stock");
    }
  }
  return summary;
}

export function generalProductCategorySummaries(products: SavedGeneralProduct[]) {
  const categories = new Set(products.flatMap(generalProductBatchRows).map((row) => row.category.trim()));
  return [...categories].map((name) => ({ name, ...summarizeGeneralProductCatalog(generalProductCatalogFamilies(products, name)) }))
    .sort((left, right) => right.records - left.records || left.name.localeCompare(right.name));
}

export type GeneralProductCatalogFilters = { query: string; productType: string; stock: string; sort: string };

export function filterGeneralProductCatalog(families: GeneralProductCatalogFamily[], filters: GeneralProductCatalogFilters) {
  const query = filters.query.trim().toLowerCase();
  const filtered = families.filter((family) => family.rows.some((row) => {
    const text = [row.productName, row.sku, row.productType, row.genericName, row.brand, row.groupId,
      family.product.codes.productCode, row.color].join(" ").toLowerCase();
    return (!query || text.includes(query)) && (!filters.productType || row.productType === filters.productType)
      && (!filters.stock || generalProductStockStatus(row.inventory) === filters.stock);
  }));
  const representative = (family: GeneralProductCatalogFamily) => family.rows[0];
  return filtered.sort((left, right) => {
    let difference = 0;
    if (filters.sort === "name") difference = left.parent.productName.localeCompare(right.parent.productName);
    else if (filters.sort === "price-low") difference = Number(representative(left).price) - Number(representative(right).price);
    else if (filters.sort === "price-high") difference = Number(representative(right).price) - Number(representative(left).price);
    else if (filters.sort === "stock-high") difference = Number(representative(right).inventory) - Number(representative(left).inventory);
    else difference = new Date(right.product.createdAt).getTime() - new Date(left.product.createdAt).getTime();
    return difference || left.product.databaseId.localeCompare(right.product.databaseId);
  });
}

export function generalProductDetailsHref(product: SavedGeneralProduct, row: GeneralProductListing, category: string) {
  return `/general-products/${product.databaseId}?${new URLSearchParams({ category, listing: row.id })}`;
}

export function categoryListingRows(products: SavedGeneralProduct[], category: string): GeneralProductListing[] {
  return products.flatMap(generalProductBatchRows).filter((row) => row.category.trim() === category.trim());
}

// Fetch every page, not just the currently visible products. Refuse an
// incomplete export if records are added/removed during pagination.
export async function loadCategoryProducts(
  category: string,
  request: (path: string) => Promise<GeneralProductCatalogResponse>,
  onProgress?: (loaded: number, total: number) => void,
) {
  const products: SavedGeneralProduct[] = [];
  const ids = new Set<string>();
  let total: number | undefined;
  let pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    const result = await request(`?${new URLSearchParams({ category, page: String(page), limit: "100" })}`);
    if (total !== undefined && total !== result.pagination.total) throw new Error("This category changed during export. Please refresh and export again.");
    total = result.pagination.total;
    pages = result.pagination.pages;
    if (result.pagination.page !== page || (page < pages && !result.products.length)) throw new Error("Unable to load the complete category. Please try again.");
    for (const product of result.products) {
      if (ids.has(product.databaseId)) throw new Error("This category changed during export. Please refresh and export again.");
      ids.add(product.databaseId);
      products.push(product);
    }
    onProgress?.(products.length, total);
  }
  if (products.length !== total) throw new Error("Unable to load the complete category. Please refresh and export again.");
  return products;
}

export const GENERAL_PRODUCT_DETAIL_SECTIONS: Array<{ title: string; fields: Array<[keyof GeneralProductListing, string]> }> = [
  { title: "Listing information", fields: [
    ["productName", "Product title"], ["category", "Category"], ["genericName", "Generic name"], ["productType", "Product type"],
    ["brand", "Brand"], ["variation", "Variation / size"], ["sku", "SKU ID"], ["styleId", "Product / Style ID"], ["groupId", "Group ID"],
  ] },
  { title: "Pricing & inventory", fields: [
    ["price", "Listing price (₹)"], ["wrongDefectiveReturnsPrice", "Wrong / defective returns price (₹)"], ["mrp", "MRP (₹)"],
    ["gst", "GST (%)"], ["hsn", "HSN code"], ["inventory", "Listed inventory"], ["quantity", "Pack quantity"], ["weight", "Weight (g)"],
  ] },
  { title: "Product specifications", fields: [
    ["color", "Color"], ["material", "Material"], ["theme", "Theme"], ["length", "Length"], ["width", "Width"],
    ["includedComponents", "Included components"], ["description", "Description"],
  ] },
  { title: "Origin & business details", fields: [
    ["country", "Country of origin"], ["manufacturer", "Manufacturer"], ["manufacturerAddress", "Manufacturer address"],
    ["manufacturerPincode", "Manufacturer pincode"], ["packer", "Packer"], ["packerAddress", "Packer address"], ["packerPincode", "Packer pincode"],
    ["importer", "Importer"], ["importerAddress", "Importer address"], ["importerPincode", "Importer pincode"],
  ] },
  { title: "Product images", fields: [["image1", "Primary image"], ["image2", "Image 2"], ["image3", "Image 3"], ["image4", "Image 4"]] },
];
