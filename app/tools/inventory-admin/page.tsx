import InventoryHome from "@/components/inventory-admin/home";
import { INVENTORY_ROOT } from "@/lib/inventory-tool-routes";
import { requireToolUser } from "@/lib/tool-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function InventoryStartPage() {
  await requireToolUser(INVENTORY_ROOT);
  return <InventoryHome />;
}
