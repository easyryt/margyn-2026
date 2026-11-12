import { notFound } from "next/navigation";
import { requireToolUser } from "@/lib/tool-auth";
import { listingReturnPath, validListingSegments } from "@/lib/listing-tool-routes";
import Products from "@/components/listing-tool/original/app/products/page";
import CreateProduct from "@/components/listing-tool/original/app/create-product/page";
import GeneralProducts from "@/components/listing-tool/original/app/general-products/page";
import CreateGeneral from "@/components/listing-tool/original/app/create-general-product/page";
import CharmBatch from "@/components/listing-tool/original/app/charms/batch/page";
import CharmDesign from "@/components/listing-tool/original/app/charms/[designNumber]/page";
import GeneralDetails from "@/components/listing-tool/original/app/general-products/[productId]/page";
import GeneralCategory from "@/components/listing-tool/original/app/general-products/category/[category]/page";
import ModelProducts from "@/components/listing-tool/original/app/products/model/[model]/page";
import ListingAnalytics from "@/components/listing-tool/original/app/page";
import ProductImport from "@/components/listing-tool/original/components/ProductImport";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Query = { [key: string]: string | string[] | undefined };
export default async function ListingSection({ params, searchParams }: { params: Promise<{ path: string[] }>; searchParams: Promise<Query> }) {
  const { path: rawPath } = await params;
  let path: string[];
  try { path = rawPath.map(decodeURIComponent); } catch { notFound(); }
  if (!validListingSegments(path)) notFound();
  await requireToolUser(listingReturnPath(path, await searchParams));
  if (path.length === 1) {
    if (path[0] === "analytics") return <ListingAnalytics />;
    if (path[0] === "import") return (
      <main className="listing-import-page">
        <header className="listing-home-heading">
          <h1>Import Excel</h1>
          <p>Add phone cover listings and design names from a spreadsheet.</p>
        </header>
        <ProductImport />
      </main>
    );
    if (path[0] === "products") return <Products />;
    if (path[0] === "create-product") return <CreateProduct />;
    if (path[0] === "general-products") return <GeneralProducts searchParams={searchParams} />;
    if (path[0] === "create-general-product") return <CreateGeneral searchParams={searchParams} />;
  }
  if (path[0] === "charms") return path[1] === "batch" ? <CharmBatch /> : <CharmDesign params={Promise.resolve({ designNumber: path[1] })} searchParams={searchParams} />;
  if (path[0] === "products") return <ModelProducts params={Promise.resolve({ model: rawPath[2] })} />;
  if (path[1] === "category") return <GeneralCategory params={Promise.resolve({ category: rawPath[2] })} />;
  return <GeneralDetails params={Promise.resolve({ productId: path[1] })} searchParams={searchParams} />;
}
