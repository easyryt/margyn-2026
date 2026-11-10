export interface SelectedModel {
  model: string;
}

export interface Product {
  // =========================
  // Basic Information
  // =========================

  productName: string;
  description: string;

  // =========================
  // Brand & Category
  // =========================

  brand: string;
  category: string;
  material: string;
  color: string;

  theme: string;
  type: string;

  // =========================
  // Pricing
  // =========================

  price: number;
  mrp: number;

  // =========================
  // Inventory
  // =========================

  inventory: number;
  weight: number;

  // =========================
  // Tax
  // =========================

  gst: number;
  hsn: string;

  // =========================
  // Country
  // =========================

  country: string;

  // =========================
  // Manufacturer
  // =========================

  manufacturer: string;
  manufacturerAddress: string;
  manufacturerPincode: string;

  // =========================
  // Packer
  // =========================

  packer: string;
  packerAddress: string;
  packerPincode: string;

  // =========================
  // Importer
  // =========================

  importer: string;
  importerAddress: string;
  importerPincode: string;

  // =========================
  // Product Details
  // =========================

  genericName: string;

  size: string;

  quantity: number;

  length: number;

  width: number;

  // =========================
  // Images
  // =========================

  image1: string;
  image2: string;
  image3: string;
  image4: string;

  // =========================
  // Export
  // =========================

  groupId: string;

  // =========================
  // Phone Models
  // =========================

  models: SelectedModel[];
}