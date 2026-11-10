export const BRANDS = ["Mobiro", "Sadarbazar", "Fibio"] as const;

const BRAND_CODES: Record<string, string> = {
  mobiro: "MBRO",
  sadarbazar: "SDBR",
  fibio: "FBO",
};

export function getBrandCode(brand: string) {
  const name = brand.trim();
  return BRAND_CODES[name.toLowerCase()] ?? name.toUpperCase();
}

export function getBrandSupplyDetails(brand: string) {
  return {
    manufacturer: brand,
    manufacturerAddress: brand,
    manufacturerPincode: brand,
    packer: brand,
    packerAddress: brand,
    packerPincode: brand,
  };
}

export function updateSkuBrand(sku: string, brand: string) {
  if (!sku.trim()) return sku;
  const separator = sku.indexOf("-");
  return separator < 0
    ? `${getBrandCode(brand)}-${sku}`
    : `${getBrandCode(brand)}${sku.slice(separator)}`;
}

export function applyProductBrand<
  T extends { brand: string; sku: string; styleId?: string },
>(product: T, brand: string) {
  return {
    ...product,
    brand,
    ...getBrandSupplyDetails(brand),
    sku: updateSkuBrand(product.sku, brand),
    styleId: product.styleId
      ? updateSkuBrand(product.styleId, brand)
      : product.styleId,
  };
}
