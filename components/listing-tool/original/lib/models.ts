import listingOptions from "./listing-options.json";

// =====================================
// Phone Models
// =====================================

export const PHONE_MODELS =
  listingOptions.compatibleModels as readonly string[];

// =====================================
// SKU Model Codes
// =====================================

export const MODEL_CODES: Record<string, string> = {
  // Apple
  "iPhone 11": "AP-IP11",
  "iPhone 12": "AP-IP12",
  "iPhone 13": "AP-IP13",
  "iPhone 14": "AP-IP14",
  "iPhone 15": "AP-IP15",
  "iPhone 16": "AP-IP16",

  // Samsung
  "Samsung S23": "SAM-S23",
  "Samsung S24": "SAM-S24",
  "Samsung S25": "SAM-S25",

  // OnePlus
  "OnePlus 12": "OP-12",
  "OnePlus 13": "OP-13",

  // Vivo
  "Vivo V40": "VV40",
  "Vivo V50": "VV50",

  // Realme
  "Realme 13": "RM13",
  "Realme 14": "RM14",

  // Redmi
  "Redmi Note 13": "RN13",
  "Redmi Note 14": "RN14",
};

// =====================================
// Helper
// =====================================

export function getModelCode(model: string): string {
  const key = model.trim();

  if (MODEL_CODES[key]) {
    return MODEL_CODES[key];
  }

  const compact = (value: string) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 24);
  const appleMatch = key.match(/^(?:APPLE\s+)?IPHONE\s+(.+)$/i);

  if (appleMatch) {
    return `AP-IP${compact(appleMatch[1])}`;
  }

  for (const [brandPattern, brandCode] of [
    [/^SAMSUNG\s+(.+)$/i, "SAM"],
    [/^ONEPLUS\s+(.+)$/i, "OP"],
    [/^VIVO\s+(.+)$/i, "VV"],
    [/^REALME\s+(.+)$/i, "RM"],
    [/^REDMI\s+(.+)$/i, "RDM"],
  ] as const) {
    const match = key.match(brandPattern);

    if (match) {
      return `${brandCode}-${compact(match[1])}`;
    }
  }

  return compact(key) || "MODEL";
}
