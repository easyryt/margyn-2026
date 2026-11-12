"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { LISTING_ROOT, LISTING_TABS } from "@/lib/listing-tool-routes";

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
    </div>
    <div className="listing-page-content">{children}</div>
  </section>;
}
