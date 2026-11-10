"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { LISTING_ROOT, LISTING_TABS } from "@/lib/listing-tool-routes";
export default function ListingFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <section className="listing-workspace" aria-label="Listing Tool workspace">
    <div className="listing-toolbar">
      <nav aria-label="Listing tool sections">{LISTING_TABS.map(tab => {
        const href = LISTING_ROOT + tab.path;
        const selected = tab.path ? pathname.startsWith(href) || (tab.path === "/products" && pathname.includes("/create-product")) || (tab.path === "/general-products" && pathname.includes("/create-general-product")) || (tab.path === "/charms/batch" && pathname.includes("/charms/")) : pathname === LISTING_ROOT;
        return <Link href={href} key={tab.label} aria-current={selected ? "page" : undefined}><Icon name={tab.icon} size={15} />{tab.label}</Link>;
      })}</nav>
      <Link href={LISTING_ROOT + "/create-general-product"} className="listing-new-product"><Icon name="plus" size={15} />New general product</Link>
    </div>
    <div className="listing-page-content">{children}</div>
  </section>;
}
