import Overview from "@/components/inventory-admin/original/page";
import { requireToolUser } from "@/lib/tool-auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function InventoryHome() { await requireToolUser("/tools/inventory-admin"); return <Overview />; }
