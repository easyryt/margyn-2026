"use client";

import ToolTips from "@/components/tool-tips";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { INVENTORY_ROOT, INVENTORY_SCAN_PATH } from "@/lib/inventory-tool-routes";
import type { InventoryProduct } from "./original/inventory/InventoryList";

const stockPath = INVENTORY_ROOT + "/inventory";

function isLowStock(product: InventoryProduct) {
  return product.minThreshold > 0 && product.rawQuantity <= product.minThreshold;
}

export default function StockList({ products, productId }: { products: InventoryProduct[]; productId?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ id: string; message: string; error?: boolean } | null>(null);
  const inFlight = useRef(false);
  const quantityInput = useRef<HTMLInputElement>(null);
  const editButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!editing && !saving) editButton.current?.focus();
  }, [editing, saving]);

  useEffect(() => {
    if (editing) quantityInput.current?.focus();
  }, [editing]);

  const query = search.trim().toLowerCase();
  const visible = products.filter(product => (
    (!productId || product.id === productId) &&
    (!query || [product.name, product.categoryName].some(value => value?.toLowerCase().includes(query))) &&
    (!lowOnly || isLowStock(product))
  )).sort((a, b) => a.name.localeCompare(b.name));

  async function addStock(event: FormEvent<HTMLFormElement>, product: InventoryProduct) {
    event.preventDefault();
    if (inFlight.current) return;
    const units = Number(quantity);
    if (!Number.isSafeInteger(units) || units < 1) {
      setNotice({ id: product.id, message: "Enter a positive whole number.", error: true });
      return;
    }

    inFlight.current = true;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/tools/inventory-admin/inventory/raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: units }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || data?.error || "Couldn’t add stock. Try again.");
      }
      setNotice({ id: product.id, message: `${units} raw ${units === 1 ? "unit" : "units"} added.` });
      setEditing(null);
      router.refresh();
    } catch (error) {
      setNotice({ id: product.id, message: error instanceof Error ? error.message : "Couldn’t add stock. Try again.", error: true });
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="stock-page">
      <header className="stock-heading">
        <h1>Inventory Admin</h1>
        <div className="stock-model-actions">
          <Link href={INVENTORY_ROOT + INVENTORY_SCAN_PATH}>Scan barcode</Link>
          <Link href={stockPath + "/low-stock"}>Low-stock report</Link>
        </div>
      </header>
      <div className="stock-filters">
        <label className="stock-search">
          <span>Find a model</span>
          <input type="search" placeholder="Search by model or category" value={search} disabled={saving} onChange={event => setSearch(event.target.value)} />
        </label>
        <div className="tool-tip-line">
          <label className="stock-low-filter">
            <input type="checkbox" checked={lowOnly} disabled={saving} onChange={event => setLowOnly(event.target.checked)} />
            Low raw stock only
          </label>
          <ToolTips label="low raw stock" tips={["Shows models whose unprinted stock is at or below their minimum. Use the low-stock report to see printed designs that also need attention."]} />
        </div>
        {productId && <Link href={stockPath}>Show all models</Link>}
      </div>

      <div className="stock-results" aria-label="Stock by model">
        {notice && !notice.error && !visible.some(product => product.id === notice.id) && (
          <p className="stock-success" role="status">{notice.message}</p>
        )}
        {visible.length === 0 && <p className="stock-panel stock-empty">No models match these filters.</p>}
        {visible.map(product => {
          const isEditing = editing === product.id;
          const hasNotice = notice?.id === product.id;
          return (
            <article key={product.id} className="stock-panel stock-model">
              <div className="stock-model-row">
                <div className="stock-model-name">
                  <h2>{product.name}</h2>
                  {product.categoryName && product.categoryName !== "-" && <p>{product.categoryName}</p>}
                  {isLowStock(product) && <span className="stock-low-label">Low raw stock</span>}
                </div>
                <dl className="stock-model-quantities">
                  <div>
                    <dt>Raw</dt><dd>{product.rawQuantity}</dd>
                    {product.minThreshold > 0 && <dd className="stock-minimum">Min. {product.minThreshold}</dd>}
                  </div>
                  <div><dt>Printed</dt><dd>{product.printedQuantity}</dd></div>
                  <div><dt>Total</dt><dd>{product.rawQuantity + product.printedQuantity}</dd></div>
                </dl>
                <div className="stock-model-actions">
                  <button type="button" className="stock-add-button" aria-expanded={isEditing}
                    aria-controls={isEditing ? `stock-form-${product.id}` : undefined}
                    disabled={saving}
                    onClick={event => {
                      if (isEditing) {
                        setEditing(null);
                        return;
                      }
                      editButton.current = event.currentTarget;
                      setEditing(product.id);
                      setQuantity("");
                      setNotice(null);
                    }}>
                    Add stock
                  </button>
                  <Link href={stockPath + "/" + product.id}>View details</Link>
                </div>
              </div>
              {isEditing && (
                <form className="stock-editor" id={`stock-form-${product.id}`} onSubmit={event => void addStock(event, product)}>
                  <div className="stock-editor-field">
                    <div className="tool-tip-line">
                      <label htmlFor={`stock-quantity-${product.id}`}>Raw units to add for {product.name}</label>
                      <ToolTips label="adding raw stock" tips={["Enter only the new unprinted units you received. Saving adds them to the current raw stock count."]} />
                    </div>
                    <input id={`stock-quantity-${product.id}`} ref={quantityInput} type="number" min="1" step="1" required inputMode="numeric" value={quantity} disabled={saving} onChange={event => setQuantity(event.target.value)} />
                  </div>
                  <button type="submit" className="stock-add-button" disabled={saving}>{saving ? "Adding…" : "Add raw stock"}</button>
                  <button type="button" className="stock-cancel-button" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
                </form>
              )}
              {hasNotice && <p className={notice.error ? "stock-error" : "stock-success"} role={notice.error ? "alert" : "status"}>{notice.message}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
