import { Suspense } from "react";
import { listProducts } from "@/lib/api";
import { requireToolUser } from "@/lib/tool-auth";
import { marketplaceReturnPath } from "@/lib/marketplace-routes";
import CategoryCatalog from "@/components/category-catalog";
import "./marketplace.css";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Marketplace" };
export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireToolUser(marketplaceReturnPath(await searchParams));
  const products = await listProducts();
  return <Suspense fallback={<p role="status">Loading marketplace…</p>}><CategoryCatalog products={products} workspace /></Suspense>;
}
