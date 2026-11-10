import { currentUser } from "@/lib/api";
import { redirect } from "next/navigation";
import SubscriptionUsage from "@/components/subscription-usage";
export const metadata = { title: "AI plans", robots: { index: false, follow: false } };
export default async function SubscriptionPage() {
  if (!await currentUser()) redirect("/login?next=/tools/subscription");
  return <div className="dashboard-content subscription-user-page"><SubscriptionUsage /></div>;
}
