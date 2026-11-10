"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import type { Cart, CartItem } from "@/lib/types";
import { money } from "@/lib/pricing.mjs";
import { Icon } from "./icons";
export function OrderSummary({
  cart,
  children,
}: {
  cart: Cart;
  children?: React.ReactNode;
}) {
  return (
    <div className="order-box cart-summary">
      <h2>Order summary</h2>
      <dl>
        <div>
          <dt>Subtotal ({cart.cartons} CTN)</dt>
          <dd>{money(cart.subtotal)}</dd>
        </div>
        {cart.discount > 0 && (
          <div className="discount-line">
            <dt>Coupon · {cart.coupon}</dt>
            <dd>−{money(cart.discount)}</dd>
          </div>
        )}
        <div>
          <dt>Shipping</dt>
          <dd>{cart.shipping ? money(cart.shipping) : "Free"}</dd>
        </div>
        <div className="summary-shipping-note">{cart.shippingLabel}</div>
        <div>
          <dt>GST</dt>
          <dd>{money(cart.tax)}</dd>
        </div>
        <div className="total-row">
          <dt>Total payable</dt>
          <dd>{money(cart.total)}</dd>
        </div>
      </dl>
      {children}
      <p className="summary-note">
        Pricing and availability are confirmed when you submit.
      </p>
    </div>
  );
}
export default function CartPage({ initialCart }: { initialCart: Cart }) {
  const [cart, setCart] = useState(initialCart),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [code, setCode] = useState("");
  const active = cart.items.filter((item) => !item.saved),
    saved = cart.items.filter((item) => item.saved);
  const vendors = [...new Set(active.map((item) => item.vendor))];
  async function change(action: object) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not update your cart.");
      setCart(data.cart);
      window.dispatchEvent(new Event("margyn:cart"));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function itemRow(item: CartItem) {
    return (
      <article className="cart-item" key={item.id}>
        <Link href={`/product/${item.productId}`}>
          <img src={item.image} alt={item.name} />
        </Link>
        <div className="cart-item-body">
          <h3>
            <Link href={`/product/${item.productId}`}>{item.name}</Link>
          </h3>
          <p>
            1 CTN · {item.packSize} pieces · {money(item.unitPrice)} / piece ·
            Size {item.size}
          </p>
          {!item.available && !item.saved && (
            <p className="cart-stock-error">
              This quantity or product is unavailable. Adjust it or remove it to
              continue.
            </p>
          )}
          <div className="cart-item-actions">
            {!item.saved && (
              <div className="quantity-stepper">
                <button
                  disabled={busy || item.quantity <= item.minOrder}
                  aria-label={`Decrease ${item.name}`}
                  onClick={() =>
                    void change({
                      type: "update",
                      id: item.id,
                      quantity: item.quantity - 1,
                    })
                  }
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  disabled={busy || item.quantity >= item.stock}
                  aria-label={`Increase ${item.name}`}
                  onClick={() =>
                    void change({
                      type: "update",
                      id: item.id,
                      quantity: item.quantity + 1,
                    })
                  }
                >
                  +
                </button>
              </div>
            )}
            <button
              disabled={busy}
              onClick={() =>
                void change({ type: "update", id: item.id, saved: !item.saved })
              }
            >
              {item.saved ? "Move to cart" : "Save for later"}
            </button>
            <button
              className="remove-item"
              disabled={busy}
              onClick={() => void change({ type: "remove", id: item.id })}
            >
              Remove
            </button>
          </div>
        </div>
        <div className="cart-item-price">
          <strong>{money(item.subtotal)}</strong>
          <small>
            {money(item.unitPrice * item.packSize)} × {item.quantity} CTN
          </small>
        </div>
      </article>
    );
  }
  return (
    <main className="commerce cart-page">
      <div className="shop-container">
        <div className="cart-page-heading">
          <h1>Your cart</h1>
          <p>
            {active.length} {active.length === 1 ? "item" : "items"} from{" "}
            {vendors.length} {vendors.length === 1 ? "vendor" : "vendors"}
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="cart-layout">
          <div>
            {active.length ? (
              vendors.map((vendor) => (
                <section key={vendor} className="vendor-cart-group">
                  <h2>
                    {vendor}
                    {active
                      .filter((item) => item.vendor === vendor)
                      .every((item) => item.verified) && (
                      <span className="verified-pill">✓ VERIFIED</span>
                    )}
                  </h2>
                  {active.filter((item) => item.vendor === vendor).map(itemRow)}
                </section>
              ))
            ) : (
              <div className="empty-cart">
                <Icon name="box" size={50} />
                <h2>Your next great dispatch starts here.</h2>
                <p>Explore packaging and add your essentials to the cart.</p>
                <Link href="/#catalog" className="button button-green">
                  Browse products <Icon name="arrow" size={17} />
                </Link>
              </div>
            )}
            {saved.length > 0 && (
              <section className="saved-cart">
                <h2>
                  Saved for later <span>{saved.length}</span>
                </h2>
                {saved.map(itemRow)}
              </section>
            )}
          </div>
          <aside className="cart-aside">
            <OrderSummary cart={cart}>
              {cart.checkoutReady ? (
                <Link href="/checkout" className="button button-green">
                  Proceed to checkout <Icon name="arrow" size={18} />
                </Link>
              ) : (
                <button className="button button-green" disabled>
                  Review your cart to continue
                </button>
              )}
            </OrderSummary>
            <form
              className="order-box coupon-form"
              onSubmit={(event) => {
                event.preventDefault();
                void change({ type: "coupon", code });
              }}
            >
              <label htmlFor="coupon">COUPON</label>
              {cart.coupon ? (
                <p className="applied-coupon">
                  {cart.coupon} applied
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void change({ type: "remove-coupon" })}
                  >
                    Remove
                  </button>
                </p>
              ) : (
                <div>
                  <input
                    id="coupon"
                    placeholder="Enter code"
                    value={code}
                    maxLength={24}
                    onChange={(event) =>
                      setCode(event.target.value.toUpperCase())
                    }
                  />
                  <button
                    className="button button-outline"
                    disabled={busy || code.trim().length < 3}
                  >
                    Apply
                  </button>
                </div>
              )}
            </form>
            <Link href="/#catalog" className="continue-shopping">
              ← Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
