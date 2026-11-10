import "../../inventory-admin.css";
import InventoryFrame from "@/components/inventory-admin/frame";
export const metadata = { title: "Inventory Admin" };
export default function InventoryLayout({ children }: { children: React.ReactNode }) { return <InventoryFrame>{children}</InventoryFrame>; }
