"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { INVENTORY_ROOT, INVENTORY_SECTIONS } from "@/lib/inventory-tool-routes";
export default function InventoryFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = INVENTORY_SECTIONS.find(section => section.path && pathname.startsWith(INVENTORY_ROOT + section.path))?.path || (pathname.includes("/barcodes/") ? "/inventory" : "");
  return <section className="inventory-workspace" aria-label="Inventory Admin workspace">
    <div className="inventory-toolbar">
      <nav aria-label="Inventory sections">{INVENTORY_SECTIONS.map(section => <Link key={section.path} href={INVENTORY_ROOT + section.path} aria-current={active === section.path ? "page" : undefined}><Icon name={section.icon} size={14} />{section.label}</Link>)}</nav>
      <label className="inventory-mobile-section">Workspace section<select aria-label="Inventory section" value={active} onChange={event => router.push(INVENTORY_ROOT + event.target.value)}>{INVENTORY_SECTIONS.map(section => <option key={section.path} value={section.path}>{section.label}</option>)}</select></label>
    </div>
    <div className="inventory-page-content">{children}</div>
  </section>;
}
