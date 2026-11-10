import "../seller-tools.css";
import { currentUser } from "@/lib/api";
import ToolDashboardShell from "@/components/tool-dashboard-shell";
export const metadata = { robots: { index: false, follow: false } };
export default async function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  // Each leaf page also verifies its session and preserves its own login return path.
  return user ? (
    <ToolDashboardShell user={user}>{children}</ToolDashboardShell>
  ) : (
    children
  );
}
