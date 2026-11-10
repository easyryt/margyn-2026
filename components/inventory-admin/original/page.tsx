import { inventoryFetch as fetch } from "@/components/inventory-admin/server";

import InventoryIndexPage from "./inventory/page";


export default async function DashboardPage() {
 
  return (
    <div className="space-y-6">
     <InventoryIndexPage
      />
    </div>
  );
}