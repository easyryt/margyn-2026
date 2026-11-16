import { notFound } from "next/navigation";
import { requireToolUser } from "@/lib/tool-auth";
import { validInventorySegments, inventoryReturnPath } from "@/lib/inventory-tool-routes";
import InventoryStock from "@/components/inventory-admin/stock";
import BarcodeScanner from "@/components/inventory-admin/barcode-scanner";
import Detail from "@/components/inventory-admin/original/inventory/[productId]/page";
import LowStock from "@/components/inventory-admin/original/inventory/low-stock/page";
import Categories from "@/components/inventory-admin/original/categories/page";
import Products from "@/components/inventory-admin/original/products/page";
import Designs from "@/components/inventory-admin/original/product-designs/page";
import Printing from "@/components/inventory-admin/original/printing-jobs/page";
import Purchases from "@/components/inventory-admin/original/purchase-orders/page";
import PackedItems from "@/components/inventory-admin/original/barcode-report/page";
import Images from "@/components/inventory-admin/original/imagekit-images/page";
import Staff from "@/components/inventory-admin/original/create-user/page";
import Barcodes from "@/components/inventory-admin/original/barcodes/[productId]/page";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function InventorySection({ params, searchParams }: { params: Promise<{ path: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { path: rawPath } = await params;
  let path: string[];
  try { path = rawPath.map(decodeURIComponent); } catch { notFound(); }
  if (!validInventorySegments(path)) notFound();
  const query = await searchParams;
  await requireToolUser(inventoryReturnPath(path, query));
  if (path.length === 2) {
    if (path[1] === "low-stock") return <LowStock />;
    const props = { params: Promise.resolve({ productId: path[1] }) };
    return path[0] === "barcodes" ? <Barcodes {...props} /> : <Detail {...props} />;
  }
  switch (path[0]) {
    case "scan-barcode": return <BarcodeScanner />;
    case "inventory": {
      const productId = typeof query.product === "string" && /^[a-f0-9]{24}$/i.test(query.product) ? query.product.toLowerCase() : undefined;
      return <InventoryStock key={productId} productId={productId} />;
    }
    case "categories": return <Categories />;
    case "products": return <Products />;
    case "product-designs": return <Designs />;
    case "printing-jobs": return <Printing />;
    case "purchase-orders": return <Purchases />;
    case "barcode-report": return <PackedItems />;
    case "imagekit-images": return <Images />;
    case "create-user": return <Staff />;
    default: notFound();
  }
}
