import type { Metadata } from "next";
import GeneralProductCatalog from "@/components/listing-tool/original/components/GeneralProductCatalog";

export const metadata: Metadata = {
  title: "Saved General Products & Analytics",
  description: "Saved general-product listings, variants, inventory, and pricing analytics.",
};

export default async function GeneralProductsPage({ searchParams }: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category.trim() : "";
  return <GeneralProductCatalog key={category} category={category} />;
}
