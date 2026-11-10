import listingOptions from "./listing-options.json";

// =========================
// Brand
// =========================

export { BRANDS } from "./brands";

// =========================
// Category
// =========================

export const CATEGORIES = listingOptions.categories as readonly string[];

// =========================
// Material
// =========================

export const MATERIALS = [
  "Silicone",
  "TPU",
  "Plastic",
  "Leather",
  "Rubber",
  "Polycarbonate",
];

// =========================
// Colors
// =========================

export const COLORS = [
  "Transparent",
  "Black",
  "White",
  "Blue",
  "Pink",
  "Red",
  "Green",
  "Purple",
  "Yellow",
  "Grey",
];

// =========================
// Theme
// =========================

export const THEMES = [
  "No Theme",
  "Animals",
  "Cartoon",
  "Floral",
  "Nature",
  "Sports",
  "Abstract",
  "Luxury",
  "Quotes",
  "Religious",
];

// =========================
// Product Type
// =========================

export const PRODUCT_TYPES = [
  "Designer",
  "Printed",
  "Plain",
  "Transparent",
  "Matte",
  "Glossy",
];

// =========================
// Pattern
// =========================

export const PATTERNS = [
  "Designer",
  "Printed",
  "Matte",
  "Glossy",
];

// =========================
// Print Type
// =========================

export const PRINT_TYPES = [
  "UVV",
  "DTF",
  "SUB",
];

// =========================
// Finish
// =========================

export const FINISHES = [
  "WL",
  "GL",
  "MT",
];
