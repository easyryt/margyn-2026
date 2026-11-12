"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { INVENTORY_OTHER_SECTIONS, INVENTORY_PRIMARY_SECTIONS, INVENTORY_ROOT, INVENTORY_SECTIONS } from "@/lib/inventory-tool-routes";

export default function InventoryFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const path = pathname.slice(INVENTORY_ROOT.length);
  const active = INVENTORY_SECTIONS.find(section => section.path === path)?.path
    ?? (path.startsWith("/inventory/") || path.startsWith("/barcodes/") ? "/inventory" : "");
  const moreActive = INVENTORY_OTHER_SECTIONS.some(section => section.path === active);
  const open = (section: string) => router.push(INVENTORY_ROOT + section);

  return (
    <section className="inventory-workspace" aria-label="Inventory Admin workspace">
      <div className="inventory-toolbar">
        <nav aria-label="Inventory sections">
          {INVENTORY_PRIMARY_SECTIONS.map(section => (
            <Link key={section.path} href={INVENTORY_ROOT + section.path} aria-current={active === section.path ? "page" : undefined}>
              <Icon name={section.icon} size={14} />{section.label}
            </Link>
          ))}
          <select aria-label="More inventory tools" value={moreActive ? active : ""} onChange={event => open(event.target.value)}>
            <option value="" disabled>More tools</option>
            {INVENTORY_OTHER_SECTIONS.map(section => <option key={section.path} value={section.path}>{section.label}</option>)}
          </select>
        </nav>
        <label className="inventory-mobile-section">
          Inventory section
          <select aria-label="Inventory section" value={active} onChange={event => open(event.target.value)}>
            {INVENTORY_PRIMARY_SECTIONS.map(section => <option key={section.path} value={section.path}>{section.label}</option>)}
            <optgroup label="More tools">
              {INVENTORY_OTHER_SECTIONS.map(section => <option key={section.path} value={section.path}>{section.label}</option>)}
            </optgroup>
          </select>
        </label>
      </div>
      <div className="inventory-page-content">{children}</div>
    </section>
  );
}
