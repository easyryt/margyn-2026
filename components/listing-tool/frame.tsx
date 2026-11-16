"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import ToolTips from "@/components/tool-tips";
import { LISTING_ROOT, LISTING_TABS } from "@/lib/listing-tool-routes";
import { listingTips } from "@/lib/seller-tool-tips";

const SECTION_TABS: Partial<Record<string, string>> = {
  "create-product": "/products",
  "create-general-product": "/general-products",
  charms: "/charms/batch",
  products: "/products",
  "general-products": "/general-products",
};

export default function ListingFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = pathname.slice(LISTING_ROOT.length).split("/")[1];
  const selectedPath = SECTION_TABS[section];
  const isStart = pathname === LISTING_ROOT;
  const builder = section === "create-product" ? "phone"
    : section === "create-general-product" ? "general" : undefined;

  return <section className="listing-workspace" data-builder={builder} aria-label="Listing Tool workspace">
    <div className="listing-toolbar">
      <nav aria-label="Listing tool sections">
        {LISTING_TABS.map(tab => {
          const selected = tab.path === "" ? isStart : selectedPath === tab.path;
          return (
            <Link href={LISTING_ROOT + tab.path} key={tab.path} aria-current={selected ? "page" : undefined}>
              <Icon name={tab.icon} size={16} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <ToolTips key={section} tips={listingTips[section] ?? listingTips[""]} />
    </div>
    <div className="listing-page-content">{children}</div>
  </section>;
}
