import type { Metadata } from "next";
import GeneralProductCatalog from "@/components/listing-tool/original/components/GeneralProductCatalog";
import { generalProductCategoryFromPath } from "@/components/listing-tool/original/lib/general-product-catalog";

export const metadata: Metadata = { title: "General Product Category Catalog", description: "Manage saved parent products and their variants by category." };

export default async function GeneralProductCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: segment } = await params;
  const category = generalProductCategoryFromPath(segment);
  return <GeneralProductCatalog key={category} category={category} />;
}
