import type { GeneralProductListing } from "./general-product-excel";
import type { GeneralProductSkuCodes } from "./general-product-listing";

// Seller-provided listing data, not the workbook's instruction/example rows.
// Product titles are deliberately excluded and must be generated for each image.
export const GENERAL_PRODUCT_DEFAULT_CODES: GeneralProductSkuCodes = {
  brandCode: "MBRO", categoryCode: "CHM", productCode: "HLDR", colorCode: "GLD",
};

export const GENERAL_PRODUCT_SHARED_DEFAULTS = {
  productName: "", category: "Beads & Charms", productType: "Phone Charms Holder",
  genericName: "Beads & Charms", variation: "Free Size", mrp: "399", gst: "18",
  hsn: "392640", weight: "10", inventory: "2000", country: "India",
  manufacturer: "Mobiro", manufacturerAddress: "Mobiro", manufacturerPincode: "Mobiro",
  packer: "Mobiro", packerAddress: "Mobiro", packerPincode: "Mobiro",
  importer: "Not Required", importerAddress: "Not Required", importerPincode: "Not Required",
  brand: "", description: "", styleId: "", sku: "", groupId: "",
} satisfies Partial<GeneralProductListing>;

export const GENERAL_PRODUCT_PACK_PRESETS = [
  {
    quantity: "10", price: "64", wrongDefectiveReturnsPrice: "63",
    includedComponents: "10 Pcs of Charms Holder",
    image1: "https://upload.meeshosupplyassets.com/cataloging/1782304788897/MBRO-CHM-HLDR-GLD-10PC-V1.png",
    image2: "https://upload.meeshosupplyassets.com/cataloging/1782304788935/sup1.png",
    image3: "https://upload.meeshosupplyassets.com/cataloging/1782304788691/sup2.png",
    image4: "https://upload.meeshosupplyassets.com/cataloging/1782304788374/sup3.png",
  },
  {
    quantity: "15", price: "84", wrongDefectiveReturnsPrice: "83",
    includedComponents: "15 Pcs of Charms Holder",
    image1: "https://upload.meeshosupplyassets.com/cataloging/1781850428167/MBRO-CHM-HLDR-GLD-15PC-V1.png",
    image2: "https://upload.meeshosupplyassets.com/cataloging/1781850428112/sup1.png",
    image3: "https://upload.meeshosupplyassets.com/cataloging/1781850427962/sup2.png",
    image4: "https://upload.meeshosupplyassets.com/cataloging/1781850427501/sup3.png",
  },
  {
    quantity: "20", price: "100", wrongDefectiveReturnsPrice: "83",
    includedComponents: "20 Pcs of Charms Holder",
    image1: "https://upload.meeshosupplyassets.com/cataloging/1781850523450/MBRO-CHM-HLDR-GLD-20PC-V1.png",
    image2: "https://upload.meeshosupplyassets.com/cataloging/1781850523432/sup1.png",
    image3: "https://upload.meeshosupplyassets.com/cataloging/1781850523361/sup2.png",
    image4: "https://upload.meeshosupplyassets.com/cataloging/1781850522661/sup3.png",
  },
  {
    quantity: "25", price: "114", wrongDefectiveReturnsPrice: "113",
    includedComponents: "25 Pcs of Charms Holder",
    image1: "https://upload.meeshosupplyassets.com/cataloging/1781850600943/MBRO-CHM-HLDR-GLD-25PC-V1.png",
    image2: "https://upload.meeshosupplyassets.com/cataloging/1781850600886/sup1.png",
    image3: "https://upload.meeshosupplyassets.com/cataloging/1781850600707/sup2.png",
    image4: "https://upload.meeshosupplyassets.com/cataloging/1781850600143/sup3.png",
  },
  {
    quantity: "30", price: "134", wrongDefectiveReturnsPrice: "133",
    includedComponents: "30 Pcs of Charms Holder",
    image1: "https://upload.meeshosupplyassets.com/cataloging/1781850711559/MBRO-CHM-HLDR-GLD-30PC-V1.png",
    image2: "https://upload.meeshosupplyassets.com/cataloging/1781850711552/sup1.png",
    image3: "https://upload.meeshosupplyassets.com/cataloging/1781850711368/sup2.png",
    image4: "https://upload.meeshosupplyassets.com/cataloging/1781850710791/sup3.png",
  },
] as const;

export function generalProductPackDefaults(quantity = "10") {
  return GENERAL_PRODUCT_PACK_PRESETS.find((preset) => preset.quantity === quantity)
    || { quantity, includedComponents: `${quantity} Pcs of Charms Holder` };
}
