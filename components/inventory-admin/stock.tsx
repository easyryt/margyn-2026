import Link from "next/link";
import { INVENTORY_ROOT } from "@/lib/inventory-tool-routes";
import { inventoryFetch } from "./server";
import StockList from "./stock-list";
import type { InventoryProduct } from "./original/inventory/InventoryList";

export default async function InventoryStock({ productId }: { productId?: string }) {
  let products: InventoryProduct[];
  try {
    const response = await inventoryFetch("/api/tools/inventory-admin/dashboard/inventory-products", {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Could not load inventory");
    const data = await response.json();
    products = Array.isArray(data) ? data : data?.products;
    if (!Array.isArray(products)) throw new Error("Invalid inventory response");
  } catch {
    return (
      <section className="stock-page">
        <h1>Inventory Admin</h1>
        <div className="stock-panel stock-empty">
          <p role="status">Couldn’t load stock. Reload the page to try again.</p>
        </div>
      </section>
    );
  }

  if (!products.length) {
    return (
      <section className="stock-page">
        <h1>Inventory Admin</h1>
        <div className="stock-panel stock-empty">
          <h2>No products yet</h2>
          <p>Create a category and product before adding stock.</p>
          <Link href={INVENTORY_ROOT + "/categories"}>Open categories</Link>
          <Link href={INVENTORY_ROOT + "/products"}>Open products</Link>
        </div>
      </section>
    );
  }

  return <StockList products={products} productId={productId} />;
}
