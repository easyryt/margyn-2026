import ListingHome from "@/components/listing-tool/home";
import { requireToolUser } from "@/lib/tool-auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function ListingPage() {
  await requireToolUser("/tools/listing-tool");
  return <ListingHome />;
}
