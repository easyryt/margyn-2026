import { IMAGE_GENERATOR_MODES } from "./image-generator/modes";
export const SELLER_TOOLS = [
  {
    id: "image-generator",
    name: "Image Generator",
    icon: "spark",
    category: "CREATE",
    description:
      "Generate product images, compose backgrounds, and enhance your photos.",
    color: "violet",
    available: true,
  },
  {
    id: "listing-tool",
    name: "Listing Tool",
    icon: "edit",
    category: "LIST",
    description: "Build phone-cover, charm and general-product listings, manage variants, and export Excel sheets.",
    color: "indigo",
    available: true,
  },
  {
    id: "inventory-admin",
    name: "Inventory Admin",
    icon: "layers",
    category: "MANAGE",
    description: "Manage raw and printed stock, designs, purchase orders, print jobs and barcode labels.",
    color: "teal",
    available: true,
  },
  {
    id: "shipping-labels",
    name: "Shipping Labels",
    icon: "truck",
    category: "DISPATCH",
    description:
      "Sort shipping labels by SKU and download grouped PDFs, a ZIP and an order summary.",
    color: "slate",
    available: true,
  },
] as const;
export type SellerTool = (typeof SELLER_TOOLS)[number];
export const toolPath = (id: string) => "/tools/" + id;
export const TOOL_LOGIN_PATHS = [
  "/tools",
  ...SELLER_TOOLS.map((tool) => toolPath(tool.id)),
  ...IMAGE_GENERATOR_MODES.filter((mode) => mode.id !== "covers").map(
    (mode) => mode.path,
  ),
];
