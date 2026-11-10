import { getModelCode } from "./models";
import { getBrandCode } from "./brands";

// =====================================
// Category Codes
// =====================================

const CATEGORY_CODES: Record<string, string> = {
  "Audio Device": "AD",
  "Back Case": "BC",
  "Back Cover": "BC",
  Electronics: "EL",
  "Electronics Accessories": "EA",
  "Mobile Case": "MC",
  "Mobile Cases & Covers": "MC",
  "Mobile Cover": "MC",
  Others: "OTH",
  "Storage Device": "SD",
  "Video Device": "VD",
  "Wearable Gadget": "WG",
};

// =====================================
// Color Codes
// =====================================

const COLOR_CODES: Record<string, string> = {
  Transparent: "TRNSPT",
  Black: "BLK",
  White: "WHT",
  Blue: "BLU",
  Pink: "PNK",
  Red: "RED",
  Green: "GRN",
  Purple: "PPL",
  Yellow: "YLW",
  Grey: "GRY",
};

// =====================================
// Helper Functions
// =====================================

function getCategoryCode(category: string) {
  return (
    CATEGORY_CODES[category.trim()] ??
    category
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
  );
}

function getColorCode(color: string) {
  return (
    COLOR_CODES[color.trim()] ??
    color.trim().toUpperCase()
  );
}

// =====================================
// SKU Generator
// =====================================

type SKUProps = {
  brand?: string;
  category?: string;
  model?: string;
  color?: string;
  printType?: string;
  finish?: string;
  designCode?: string;
  designNumber?: string;
  version?: string;
};

export function generateSKU({
  brand,
  category,
  model,
  color,
  printType,
  finish,
  designCode,
  designNumber,
  version,
}: SKUProps) {
  return [
    getBrandCode(brand ?? ""),
    getCategoryCode(category ?? ""),
    getModelCode(model ?? ""),
    (printType ?? "UVV").toUpperCase(),
    (designCode ?? "DESIGN")
      .toUpperCase()
      .replace(/\s+/g, ""),
    (finish ?? "WL").toUpperCase(),
    getColorCode(color ?? ""),
    `${designNumber ?? "001"}.1.V${version ?? "1"}`,
  ].join("-");
}
