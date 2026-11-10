import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";
import "./announcement.css";
import "./promo-banner.css";
import "./category.css";
import "./profile.css";
import "./address.css";
import "./subscriptions.css";
import { getAnnouncement } from "@/lib/api";
import AnnouncementBanner from "@/components/announcement-banner";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "MARGYN — Packaging for your next chapter",
    template: "%s | MARGYN",
  },
  description:
    "Discover courier bags, shipping boxes, labels and everyday packaging. A marketplace built for your business.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const announcement = await getAnnouncement().catch(() => null);
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AnnouncementBanner settings={announcement} />
        {children}
      </body>
    </html>
  );
}
