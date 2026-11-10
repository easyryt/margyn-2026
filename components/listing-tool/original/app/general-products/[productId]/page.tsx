import type { Metadata } from "next";
import GeneralProductDetails from "@/components/listing-tool/original/components/GeneralProductDetails";

export const metadata: Metadata = { title: "General Product Details", description: "View, edit and export saved product and variant details." };

export default async function GeneralProductDetailPage({ params, searchParams }: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ category?: string | string[]; listing?: string | string[] }>;
}) {
  const [{ productId }, query] = await Promise.all([params, searchParams]);
  const listing = typeof query.listing === "string" ? query.listing : "";
  return <GeneralProductDetails key={`${productId}:${listing}`} productId={productId} initialListingId={listing} category={typeof query.category === "string" ? query.category : ""} />;
}
