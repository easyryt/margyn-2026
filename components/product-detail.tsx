"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { money, priceRange, linePrice } from "@/lib/pricing.mjs";
import { addToCart, ProductCard } from "./storefront";
import { Icon } from "./icons";
import { categoryHref } from "@/lib/categories";
export default function ProductDetail({
  product: p,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const [quantity, setQuantity] = useState(p.minOrder),
    [size, setSize] = useState(p.sizes[0]),
    [image, setImage] = useState(p.image),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const price = linePrice(p, quantity);
  const valid = quantity >= p.minOrder && quantity <= p.stock;
  async function add(buy = false) {
    setBusy(true);
    setNotice("");
    try {
      await addToCart(p, quantity, size);
      if (buy) window.location.assign("/checkout");
      else
        setNotice(
          "Added to your cart. You can keep browsing or review your order.",
        );
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const addButton = (
    <button
      className="button button-green"
      onClick={() => void add()}
      disabled={busy || !valid}
    >
      {busy
        ? "Adding…"
        : p.stock === 0
          ? "Out of stock"
          : `Add to cart — ${quantity} CTN (${quantity * p.packSize} pieces)`}
    </button>
  );
  return (
    <main className="commerce product-page">
      <div className="shop-container">
        <div className="shop-breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href={categoryHref(p.category)}>{p.category}</Link>
          <span>/</span>
          <span>{size}</span>
        </div>
        <div className="detail-layout">
          <div className="detail-gallery">
            <div className="detail-hero-image">
              <img src={image} alt={p.name} />
              <span>Hover for a closer look</span>
            </div>
            <div className="detail-thumbnails">
              {p.images.map((url, index) => (
                <button
                  key={url}
                  className={image === url ? "active" : ""}
                  onClick={() => setImage(url)}
                  aria-label={`Show product image ${index + 1}`}
                >
                  <img src={url} alt={`${p.name}, image ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="detail-purchase">
            <span className="dispatch-tag">
              Dispatch in {p.dispatchDays} business days
            </span>
            <h1>{p.name}</h1>
            <p className="detail-vendor">
              {p.vendor} {p.verified && <span>✓ Verified vendor</span>}
              <small>SKU {p.sku}</small>
            </p>
            <p className="detail-range">
              {priceRange(p)} / {p.unit}
              <span>+ {p.gstRate}% GST</span>
            </p>
            <p className="tax-note">
              Prices exclude GST. Tax is included in the order summary.
            </p>
            <section className="purchase-panel">
              <h2>Enter your quantity</h2>
              <p>Wholesale pricing adjusts to your carton quantity.</p>
              <div className="tier-heading">
                <strong>Pack size</strong>
                <span>Prices excl. GST · {p.packSize} pieces per CTN</span>
              </div>
              <div className="tier-options">
                {p.tiers.map((tier, index) => {
                  const next = p.tiers[index + 1];
                  const active =
                    quantity >= tier.minCartons &&
                    (!next || quantity < next.minCartons);
                  return (
                    <button
                      key={tier.minCartons}
                      className={active ? "selected" : ""}
                      onClick={() => setQuantity(tier.minCartons)}
                      disabled={tier.minCartons > p.stock}
                    >
                      <span className="radio-circle" />
                      <span>
                        <strong>
                          {tier.minCartons} CTN · {tier.minCartons * p.packSize}{" "}
                          pieces
                        </strong>
                        <small>
                          Dispatch in {p.dispatchDays} business days
                        </small>
                      </span>
                      {tier.price < p.price && (
                        <em>
                          Save {Math.round((1 - tier.price / p.price) * 100)}%
                        </em>
                      )}
                      <span className="tier-price">
                        <strong>
                          {money(tier.price * p.packSize * tier.minCartons)}
                        </strong>
                        <small>
                          {money(tier.price)} / {p.unit}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="quantity-row">
                <div>
                  <strong>Quantity (CTN)</strong>
                  <small>
                    {quantity} CTN · {quantity * p.packSize} pieces ·{" "}
                    {money(price.unitPrice)} / {p.unit}
                  </small>
                </div>
                <div className="quantity-stepper">
                  <button
                    onClick={() =>
                      setQuantity(Math.max(p.minOrder, quantity - 1))
                    }
                    disabled={quantity <= p.minOrder}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    aria-label="Carton quantity"
                    min={p.minOrder}
                    max={Math.max(p.minOrder, p.stock)}
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        Math.max(
                          p.minOrder,
                          Math.min(
                            10000,
                            Number(event.target.value) || p.minOrder,
                          ),
                        ),
                      )
                    }
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={quantity >= p.stock}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="size-options">
                <strong>Size</strong>
                <div>
                  {p.sizes.map((option) => (
                    <button
                      key={option}
                      aria-pressed={option === size}
                      className={option === size ? "active" : ""}
                      onClick={() => setSize(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              {!valid && (
                <p className="error" role="alert">
                  {p.stock === 0
                    ? "This product is currently out of stock."
                    : `Choose between ${p.minOrder} and ${p.stock} cartons.`}
                </p>
              )}
              {addButton}
            </section>
            {notice && (
              <div className="cart-notice" role="status">
                {notice}
                <Link href="/cart">View cart →</Link>
              </div>
            )}
            <section className="description-panel">
              <h2>Product details</h2>
              <p>{p.description}</p>
              <dl>
                <div>
                  <dt>Specification</dt>
                  <dd>{p.specification}</dd>
                </div>
                <div>
                  <dt>Ships from</dt>
                  <dd>{p.shipsFrom}</dd>
                </div>
                <div>
                  <dt>Pack size</dt>
                  <dd>{p.packSize} pieces per carton</dd>
                </div>
              </dl>
            </section>
          </div>
          <aside className="detail-order-summary">
            <div className="order-box">
              <span
                className={`stock-label ${p.stock === 0 ? "no-stock" : ""}`}
              >
                {p.stock > 0
                  ? `In stock · ${(p.stock * p.packSize).toLocaleString("en-IN")} pieces available`
                  : "Out of stock"}
              </span>
              <h2>{money(price.total)}</h2>
              <p>
                {quantity} CTN · {p.packSize * quantity} pieces · incl. GST
              </p>
              <dl className="summary-lines">
                <div>
                  <dt>Price</dt>
                  <dd>{money(price.subtotal)}</dd>
                </div>
                <div>
                  <dt>GST @ {p.gstRate}%</dt>
                  <dd>{money(price.tax)}</dd>
                </div>
                <div>
                  <dt>Total incl. GST</dt>
                  <dd>{money(price.total)}</dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>Quoted in cart</dd>
                </div>
                <div>
                  <dt>Dispatches from</dt>
                  <dd>{p.shipsFrom}</dd>
                </div>
              </dl>
              {addButton}
              <button
                className="button button-outline"
                onClick={() => void add(true)}
                disabled={busy || !valid}
              >
                Buy now
              </button>
              <p className="summary-note">
                <Icon name="shield" size={15} />
                Review your order before submitting.
              </p>
            </div>
            <div className="order-box detail-help">
              <h3>Buying for your business?</h3>
              <p>
                Select a wholesale tier and size. Your order request is sent to
                the store for confirmation. Payment is arranged after the store
                confirms your request.
              </p>
            </div>
          </aside>
        </div>
        {related.length > 0 && (
          <section className="related-products">
            <h2>Complete your packing station.</h2>
            <div className="market-grid">
              {related.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
