import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { INVENTORY_OTHER_SECTIONS, INVENTORY_ROOT, INVENTORY_SCAN_PATH } from "@/lib/inventory-tool-routes";
import { inventoryFetch } from "./server";

const lowStockPath = "/inventory/low-stock";
const actions = [
  { path: "/inventory", title: "Manage stock", description: "Find a model, check quantities, or add raw stock.", icon: "layers" },
  { path: INVENTORY_SCAN_PATH, title: "Scan barcode", description: "Pack items with your camera and update stock as you go.", icon: "search" },
  { path: "/printing-jobs", title: "Print jobs", description: "Create a print job and track printed stock.", icon: "edit" },
  { path: "/purchase-orders", title: "Receive purchases", description: "Create purchase orders and confirm stock arrivals.", icon: "truck" },
];

type LowStockItem = {
  _id: string;
  productId?: string;
  productName?: string;
  designName?: string;
  designCode?: string;
  quantity: number;
  minThreshold: number;
  type: "RAW" | "PRINTED";
};

async function LowStockPreview() {
  let items: LowStockItem[];
  try {
    const response = await inventoryFetch("/api/tools/inventory-admin" + lowStockPath, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Could not load low stock");
    const data: { lowStockItems?: LowStockItem[] } = await response.json();
    if (!Array.isArray(data.lowStockItems)) throw new Error("Invalid low-stock response");
    items = data.lowStockItems.slice(0, 3);
  } catch {
    return <p className="inventory-panel-message" role="status">Couldn’t load low-stock items.</p>;
  }

  if (!items.length) return <p className="inventory-panel-message">No low-stock items.</p>;

  return (
    <ul className="inventory-stock-preview">
      {items.map(item => {
        const href = item.productId && /^[a-f0-9]{24}$/i.test(item.productId)
          ? `${INVENTORY_ROOT}/inventory/${item.productId}` : INVENTORY_ROOT + lowStockPath;
        return (
          <li key={item._id}>
            <Link href={href}>
              <span>
                <strong>{item.productName || "Unnamed product"}</strong>
                <small>{item.designName || item.designCode || (item.type === "RAW" ? "Raw stock" : "Printed stock")}</small>
              </span>
              <span className="inventory-stock-quantity">
                <strong>{item.quantity} in stock</strong>
                <small>Minimum {item.minThreshold}</small>
              </span>
              <Icon name="arrow" size={16} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function InventoryHome() {
  return (
    <div className="inventory-home">
      <h1>Inventory Admin</h1>

      <section aria-labelledby="inventory-actions-heading">
        <h2 id="inventory-actions-heading">Quick actions</h2>
        <div className="inventory-action-grid">
          {actions.map(action => (
            <Link key={action.path} className="inventory-action-card" href={INVENTORY_ROOT + action.path}>
              <span className="inventory-action-icon"><Icon name={action.icon} size={21} /></span>
              <span className="inventory-action-copy">
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </span>
              <Icon name="arrow" size={18} className="inventory-action-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <div className="inventory-home-panels">
        <section className="inventory-home-panel" aria-labelledby="inventory-low-stock-heading">
          <header>
            <h2 id="inventory-low-stock-heading">Low-stock items</h2>
            <Link href={INVENTORY_ROOT + lowStockPath}>View low stock</Link>
          </header>
          <Suspense fallback={<p className="inventory-panel-message" role="status">Loading low-stock items…</p>}>
            <LowStockPreview />
          </Suspense>
        </section>

        <section className="inventory-home-panel" aria-labelledby="inventory-more-tools-heading">
          <header><h2 id="inventory-more-tools-heading">More inventory tools</h2></header>
          <ul className="inventory-more-links">
            {INVENTORY_OTHER_SECTIONS.filter(section => section.path !== lowStockPath && section.path !== INVENTORY_SCAN_PATH).map(section => (
              <li key={section.path}>
                <Link href={INVENTORY_ROOT + section.path}>
                  <Icon name={section.icon} size={16} />{section.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
