export type User = {
  id: string;
  phone: string;
  name: string;
  role: "admin" | "customer";
  createdAt: number;
};
export type PriceTier = { minCartons: number; price: number };
export type Product = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  price: number;
  compareAt: number;
  unit: string;
  minOrder: number;
  stock: number;
  image: string;
  images: string[];
  status: "published" | "draft";
  featured: boolean;
  createdAt: number;
  updatedAt: number;
  vendor: string;
  verified: boolean;
  specification: string;
  packSize: number;
  sizes: string[];
  tiers: PriceTier[];
  gstRate: number;
  dispatchDays: number;
  shipsFrom: string;
};
export type CartItem = {
  id: string;
  productId: string;
  name: string;
  image: string;
  vendor: string;
  verified: boolean;
  size: string;
  quantity: number;
  packSize: number;
  stock: number;
  minOrder: number;
  unitPrice: number;
  subtotal: number;
  tax: number;
  gstRate: number;
  saved: boolean;
  available: boolean;
};
export type Cart = {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  cartons: number;
  coupon: string;
  shippingLabel: string;
  checkoutReady: boolean;
};
export type Address = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
};
export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  phone: string;
  address: Address;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: number;
};

export type AnnouncementSettings = {
  enabled: boolean;
  message: string;
  link: string;
  backgroundColor: string;
  textColor: string;
  speed: "slow" | "normal" | "fast";
  updatedAt: number;
};

export type PromoBannerSettings = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  features: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  image: string;
  imageAlt: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  badgeTitle: string;
  badgeText: string;
  updatedAt: number;
};

export type SavedAddress = Address & {
  id: string;
  label: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
};
export type Profile = {
  id: string;
  name: string;
  phone: string;
  createdAt: number;
  addresses: SavedAddress[];
};

export type IndianState = { code: string; name: string };
