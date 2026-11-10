import { SellerToolsDashboard } from "@/components/seller-tools-dashboard";
import { requireToolUser } from "@/lib/tool-auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Seller tools" };
export default async function SellerToolsPage() {
  const user = await requireToolUser("/tools");
  return <SellerToolsDashboard user={user} />;
}
