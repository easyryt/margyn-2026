"use client";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import { money } from "@/lib/pricing.mjs";
import Dialog from "./dialog";
export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<Order | null>(null);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrders(data.orders);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function update(status: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelected(data.order);
      setOrders((current) =>
        current.map((order) =>
          order.id === data.order.id ? data.order : order,
        ),
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const transitions: Record<string, string[]> = {
    requested: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: [],
    cancelled: [],
  };
  return (
    <section className="admin-table-section">
      <div className="admin-table-title">
        <div>
          <h2>
            Order requests <span>{orders.length}</span>
          </h2>
          <p>
            Payment integration is pending. Requests are recorded as unpaid.
          </p>
        </div>
        <button className="text-button" disabled={busy} onClick={load}>
          {busy ? "Loading…" : "Refresh orders"}
        </button>
      </div>
      {error && !selected && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{order.orderNumber}</strong>
                  <small>
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeZone: "Asia/Kolkata",
                    }).format(order.createdAt)}
                  </small>
                </td>
                <td>
                  {order.address.name}
                  <small>{order.phone}</small>
                </td>
                <td>
                  {money(order.total)}
                  <small>Unpaid</small>
                </td>
                <td>
                  <span className="status-pill order-status">
                    {order.status}
                  </span>
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSelected(order);
                      setError("");
                    }}
                  >
                    View order
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!busy && !orders.length && (
          <div className="empty-state">
            <h3>No order requests yet</h3>
            <p>Submitted checkout requests will appear here.</p>
          </div>
        )}
      </div>
      {selected && (
        <Dialog
          title={selected.orderNumber}
          onClose={() => {
            if (!busy) {
              setSelected(null);
              setError("");
            }
          }}
          wide
        >
          <div className="admin-order-detail">
            <section>
              <h3>{selected.address.name}</h3>
              <p>
                {selected.address.line1}
                <br />
                {selected.address.line2}
                <br />
                {selected.address.city}, {selected.address.state} –{" "}
                {selected.address.pincode}
                <br />
                {selected.address.phone}
              </p>
              {selected.address.gstin && <p>GSTIN: {selected.address.gstin}</p>}
            </section>
            <section>
              <strong className="order-status">{selected.status}</strong>
              <p>Payment: unpaid · integration pending</p>
              <h3>{money(selected.total)}</h3>
            </section>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Cartons</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.size}</td>
                    <td>{item.quantity}</td>
                    <td>{money(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="admin-order-actions">
            {transitions[selected.status]?.map((status) => (
              <button
                key={status}
                className={`button ${status === "cancelled" ? "button-danger" : "button-green"}`}
                disabled={busy}
                onClick={() => void update(status)}
              >
                {status === "cancelled"
                  ? "Cancel & restore stock"
                  : `Mark ${status}`}
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </section>
  );
}
