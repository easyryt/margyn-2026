"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { Icon } from "./icons";
import { priceRange } from "@/lib/pricing.mjs";
import { categoryHref } from "@/lib/categories";
export { money } from "@/lib/pricing.mjs";
export async function addToCart(
  product: Product,
  quantity = product.minOrder,
  size = product.sizes[0],
) {
  const response = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "add",
      productId: product.id,
      quantity,
      size,
    }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Could not add this product.");
  window.dispatchEvent(new Event("margyn:cart"));
  return data.cart;
}
export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [liked, setLiked] = useState(false);
  async function add(buy = false) {
    setBusy(true);
    setNotice("");
    try {
      await addToCart(product);
      if (buy) router.push("/checkout");
      else setNotice("Added to your cart.");
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveLater() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "add",
          productId: product.id,
          size: product.sizes[0],
          quantity: product.minOrder,
          saved: true,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save the product.");
      const saved = data.cart.items.some(
        (item: { productId: string; saved: boolean }) =>
          item.productId === product.id && item.saved,
      );
      setLiked(saved);
      setNotice(
        saved
          ? "Saved for later. Find it in your cart."
          : "This product is already in your cart.",
      );
      window.dispatchEvent(new Event("margyn:cart"));
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="market-card landing-product">
      <div className="landing-product-visual">
        <Link href={`/product/${product.id}`} className="landing-product-image">
          <img src={product.image} alt={product.name} loading="lazy" />
        </Link>
        {product.featured && (
          <span className="landing-product-pick">
            <Icon name="spark" size={12} /> MARGYN PICK
          </span>
        )}
        <button
          className={`landing-save-button ${liked ? "is-liked" : ""}`}
          aria-label={`Save ${product.name} for later`}
          aria-pressed={liked}
          disabled={busy}
          onClick={() => void saveLater()}
        >
          <Icon name="heart" size={19} />
        </button>
        <Link
          className="landing-view-product"
          href={`/product/${product.id}`}
          aria-label={`View ${product.name}`}
        >
          Take a closer look <Icon name="arrow" size={15} />
        </Link>
      </div>
      <div className="landing-product-body">
        <div className="landing-product-meta">
          <span>
            {product.vendor}
            {product.verified && <Icon name="shield" size={12} />}
          </span>
          <span
            className={product.stock ? "product-in-stock" : "product-sold-out"}
          >
            <i />
            {product.stock ? "In stock" : "Out of stock"}
          </span>
        </div>
        <h3>
          <Link href={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="landing-product-spec">
          {product.category}
          <span>·</span>Pack of {product.packSize}
        </p>
        <div className="landing-product-price">
          <strong>
            {priceRange(product)}
            <small> / {product.unit}</small>
          </strong>
          <span>GST shown at checkout</span>
        </div>
        <div className="landing-product-actions">
          <button
            className="landing-add-button"
            disabled={busy || product.stock === 0}
            onClick={() => void add()}
          >
            <Icon name="plus" size={17} />
            {product.stock === 0
              ? "Out of stock"
              : busy
                ? "Adding…"
                : "Add to cart"}
          </button>
          <button
            className="landing-buy-button"
            disabled={busy || product.stock === 0}
            onClick={() => void add(true)}
          >
            Buy now <Icon name="arrow" size={16} />
          </button>
        </div>
        {notice && (
          <p role="status" className="landing-card-notice">
            {notice}
          </p>
        )}
      </div>
    </article>
  );
}
export default function Storefront({ products }: { products: Product[] }) {
  const [category, setCategory] = useState("All products"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("featured");
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const shown = products
    .filter(
      (p) =>
        (category === "All products" || p.category === category) &&
        `${p.name} ${p.sku} ${p.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : sort === "newest"
            ? b.createdAt - a.createdAt
            : Number(b.featured) - Number(a.featured),
    );

  function browse(value: string) {
    setCategory(value);
    setQuery("");
    document.getElementById("catalog")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  return (
    <>
      <section className="landing-categories landing-container" id="categories">
        <div className="landing-section-heading compact-heading">
          <div>
            <span className="landing-section-label">
              EVERYTHING IN ITS PLACE.
            </span>
            <h2>
              Find your <em>perfect fit.</em>
            </h2>
          </div>
          <button
            className="landing-text-link"
            onClick={() => browse("All products")}
          >
            Explore all packaging <Icon name="arrow" size={18} />
          </button>
        </div>
        <div className="landing-category-grid">
          {categories.slice(0, 6).map((name, index) => {
            const items = products.filter((p) => p.category === name);
            return (
              <Link
                href={categoryHref(name)}
                className={`landing-category category-tone-${index % 3}`}
                key={name}
                aria-label={`Browse ${name}`}
              >
                <span className="category-overline">
                  THE {String(index + 1).padStart(2, "0")} EDIT
                </span>
                <img src={items[0].image} alt="" loading="lazy" />
                <span className="category-name">
                  {name}
                  <Icon name="arrow" size={17} />
                </span>
                <span className="category-count">
                  {items.length}{" "}
                  {items.length === 1 ? "essential" : "essentials"} to discover
                </span>
              </Link>
            );
          })}
        </div>
        {!categories.length && (
          <p className="landing-empty-categories">
            New packaging collections will appear here soon.
          </p>
        )}
      </section>
      <section
        className="landing-catalog landing-container"
        id="catalog"
        aria-labelledby="catalog-title"
      >
        <div className="landing-section-heading">
          <div>
            <span className="landing-section-label">
              MEET YOUR NEW ESSENTIALS.
            </span>
            <h2 id="catalog-title">
              Your next dispatch
              <br />
              starts <em>right here.</em>
            </h2>
          </div>
          <p>
            A little of everything you need.
            <br />A lot of possibility for your business.
          </p>
        </div>
        <div className="landing-catalog-toolbar">
          <label className="landing-product-search">
            <Icon name="search" size={19} />
            <input
              type="search"
              aria-label="Search products"
              placeholder="What’s on your packing list?"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <Icon name="close" size={17} />
              </button>
            )}
          </label>
          <label className="landing-sort">
            Sort by{" "}
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest first</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        </div>
        <div className="landing-filter-row">
          <div className="landing-filter-pills" aria-label="Product categories">
            {["All products", ...categories].map((item) => (
              <button
                key={item}
                className={category === item ? "is-active" : ""}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <span className="landing-result-count" aria-live="polite">
            {shown.length} {shown.length === 1 ? "product" : "products"}
          </span>
        </div>
        <div className="market-grid landing-product-grid">
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {!shown.length && (
          <div className="empty-state">
            <Icon name="search" size={35} />
            <h3>No products found</h3>
            <p>Try another search or category.</p>
            <button
              className="landing-button"
              onClick={() => {
                setQuery("");
                setCategory("All products");
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}
