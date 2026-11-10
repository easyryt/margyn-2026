"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Product } from "@/lib/types";
import {
  categoryHref,
  categorySlug,
  categorySummaries,
  startingPrice,
} from "@/lib/categories";
import { money, priceRange } from "@/lib/pricing.mjs";
import { ProductCard } from "./storefront";
import { Icon } from "./icons";
import Dialog from "./dialog";

type Option = { value: string; count: number };
function subscribeToFilters(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("margyn:category-filters", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("margyn:category-filters", callback);
  };
}
function options(values: string[]): Option[] {
  return [...new Set(values)]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((value) => ({
      value,
      count: values.filter((item) => item === value).length,
    }));
}
export default function CategoryCatalog({
  products,
  category: initialCategory,
  workspace = false,
}: {
  products: Product[];
  category?: string;
  workspace?: boolean;
}) {
  const pathname = usePathname();
  const navigationParams = useSearchParams();
  const filterQuery = useSyncExternalStore(
    subscribeToFilters,
    () => new URLSearchParams(window.location.search).toString(),
    () => navigationParams.toString(),
  );
  const params = new URLSearchParams(filterQuery);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const categories = categorySummaries(products);
  const category = workspace
    ? categories.find((item) => item.slug === params.get("category"))?.name
    : initialCategory;
  const scoped = category
    ? products.filter(
        (product) => categorySlug(product.category) === categorySlug(category),
      )
    : products;
  const title = category || "Packaging essentials";
  const query = params.get("q") || "";
  const searchWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const bound = (value: string | null) =>
    value && Number.isFinite(Number(value)) && Number(value) >= 0 ? value : "";
  const min = bound(params.get("min"));
  const max = bound(params.get("max"));
  const requestedSort = params.get("sort") || "featured";
  const sort = ["featured", "price-asc", "price-desc", "newest"].includes(
    requestedSort,
  )
    ? requestedSort
    : "featured";
  const sizes = params.getAll("size"),
    specifications = params.getAll("spec"),
    packs = params.getAll("pack"),
    vendors = params.getAll("vendor");
  const inStock = params.get("stock") === "1",
    verified = params.get("verified") === "1";
  const minPrice =
    min && Number.isFinite(Number(min)) ? Math.max(0, Number(min)) : 0;
  const maxPrice =
    max && Number.isFinite(Number(max)) ? Math.max(0, Number(max)) : Infinity;
  const invalidRange = minPrice > maxPrice;
  const sizeOptions = options(scoped.flatMap((product) => product.sizes));
  const specOptions = options(scoped.map((product) => product.specification));
  const packOptions = options(
    scoped.map((product) => String(product.packSize)),
  );
  const vendorOptions = options(scoped.map((product) => product.vendor));
  const ceiling = Math.max(
    1,
    Math.ceil(Math.max(0, ...scoped.map(startingPrice))),
  );
  const activeCount =
    [query.trim(), min, max, inStock, verified, workspace && category].filter(Boolean).length +
    sizes.length +
    specifications.length +
    packs.length +
    vendors.length;
  const shown = scoped
    .filter((product) => {
      const price = startingPrice(product);
      return (
        !invalidRange &&
        price >= minPrice &&
        price <= maxPrice &&
        searchWords.every((word) =>
          [product.name, product.sku, product.vendor, product.specification, product.category, product.description, ...product.sizes]
            .join(" ").toLowerCase().includes(word)) &&
        (!sizes.length || product.sizes.some((size) => sizes.includes(size))) &&
        (!specifications.length ||
          specifications.includes(product.specification)) &&
        (!packs.length || packs.includes(String(product.packSize))) &&
        (!vendors.length || vendors.includes(product.vendor)) &&
        (!inStock || product.stock > 0) &&
        (!verified || product.verified)
      );
    })
    .sort((a, b) =>
      sort === "price-asc"
        ? startingPrice(a) - startingPrice(b) || a.name.localeCompare(b.name)
        : sort === "price-desc"
          ? startingPrice(b) - startingPrice(a) || a.name.localeCompare(b.name)
          : sort === "newest"
            ? b.createdAt - a.createdAt
            : Number(b.featured) - Number(a.featured),
    );
  const compared = scoped.filter((product) => selected.includes(product.id));
  function update(values: Record<string, string | string[]>) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(values)) {
      next.delete(key);
      for (const item of Array.isArray(value) ? value : [value])
        if (item) next.append(key, item);
    }
    const search = next.toString();
    window.history.replaceState(
      null,
      "",
      pathname + (search ? "?" + search : "") + window.location.hash,
    );
    window.dispatchEvent(new Event("margyn:category-filters"));
  }
  function toggle(key: string, value: string) {
    const current = new URLSearchParams(window.location.search).getAll(key);
    update({
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  }
  function reset() {
    window.history.replaceState(null, "", pathname);
    window.dispatchEvent(new Event("margyn:category-filters"));
  }
  function chooseCategory(slug: string) {
    setSelected([]);
    update({ category: slug, size: [], spec: [], pack: [], vendor: [] });
  }
  function checkboxGroup(
    label: string,
    key: string,
    values: Option[],
    picked: string[],
    prefix: string,
    unit = "",
  ) {
    return (
      values.length > 0 && (
        <details className="category-facet" open>
          <summary>
            {label}
            <Icon name="chevron" size={14} />
          </summary>
          <div className="category-facet-options">
            {values.map((option) => (
              <label key={option.value}>
                <input
                  type="checkbox"
                  aria-label={prefix + " " + option.value}
                  checked={picked.includes(option.value)}
                  onChange={() => toggle(key, option.value)}
                />
                <span>
                  {option.value}
                  {unit}
                </span>
                <small>{option.count}</small>
              </label>
            ))}
          </div>
        </details>
      )
    );
  }
  function filters() {
    return (
      <div className="category-filter-content">
        <div className="category-filter-heading">
          <span>
            <Icon name="sliders" size={18} />
            Refine your search
          </span>
          <button
            onClick={reset}
            disabled={!activeCount}
            aria-label="Reset all filters"
          >
            Reset
          </button>
        </div>
        <nav
          className="category-collection-nav"
          aria-label="Packaging categories"
        >
          {workspace ? <>
            <button type="button" aria-current={!category ? "page" : undefined} onClick={() => chooseCategory("")}>
              <span>All packaging</span><small>{products.length}</small>
            </button>
            {categories.map((item) => <button type="button" key={item.slug} aria-current={categorySlug(category || "") === item.slug ? "page" : undefined} onClick={() => chooseCategory(item.slug)}>
              <span>{item.name}</span><small>{item.count}</small>
            </button>)}
          </> : <>
          <Link
            href="/categories"
            aria-current={!category ? "page" : undefined}
          >
            <span>All packaging</span>
            <small>{products.length}</small>
          </Link>
          {categories.map((item) => (
            <Link
              href={categoryHref(item.name)}
              key={item.slug}
              aria-current={
                categorySlug(category || "") === item.slug ? "page" : undefined
              }
            >
              <span>{item.name}</span>
              <small>{item.count}</small>
            </Link>
          ))}
          </>}
        </nav>
        <details className="category-facet" open>
          <summary>
            Price per piece
            <Icon name="chevron" size={14} />
          </summary>
          <p className="category-filter-note">
            Based on the lowest listed tier.
          </p>
          <div className="category-price-inputs">
            <label>
              <span>₹</span>
              <input
                type="number"
                aria-label="Minimum price"
                min={0}
                step="0.01"
                placeholder="Min"
                value={min}
                onChange={(event) => update({ min: event.target.value })}
              />
            </label>
            <span>—</span>
            <label>
              <span>₹</span>
              <input
                type="number"
                aria-label="Maximum price"
                min={0}
                step="0.01"
                placeholder="Max"
                value={max}
                onChange={(event) => update({ max: event.target.value })}
              />
            </label>
          </div>
          <input
            className="category-price-slider"
            type="range"
            min={0}
            max={Math.max(ceiling, Number(max) || 0)}
            step="0.01"
            value={max ? Math.max(0, Number(max) || 0) : ceiling}
            aria-label="Maximum price slider"
            onChange={(event) => update({ max: event.target.value })}
          />
          <div className="category-price-presets">
            {[
              { label: "Under ₹5", min: "", max: "5" },
              { label: "₹5–₹20", min: "5", max: "20" },
              { label: "₹20–₹100", min: "20", max: "100" },
              { label: "₹100+", min: "100", max: "" },
            ].map((range) => (
              <button
                key={range.label}
                onClick={() => update({ min: range.min, max: range.max })}
              >
                {range.label}
              </button>
            ))}
          </div>
          {invalidRange && (
            <p className="category-range-error" role="alert">
              Minimum price cannot exceed maximum price.
            </p>
          )}
        </details>
        {checkboxGroup("Size", "size", sizeOptions, sizes, "Size")}
        {checkboxGroup(
          "Material & specification",
          "spec",
          specOptions,
          specifications,
          "Specification",
        )}
        {checkboxGroup(
          "Pack size",
          "pack",
          packOptions,
          packs,
          "Pack size",
          " pieces",
        )}
        {checkboxGroup("Vendor", "vendor", vendorOptions, vendors, "Vendor")}
        <details className="category-facet" open>
          <summary>
            Availability
            <Icon name="chevron" size={14} />
          </summary>
          <div className="category-facet-options">
            <label>
              <input
                type="checkbox"
                checked={inStock}
                onChange={(event) =>
                  update({ stock: event.target.checked ? "1" : "" })
                }
              />
              <span>In stock only</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={verified}
                onChange={(event) =>
                  update({ verified: event.target.checked ? "1" : "" })
                }
              />
              <span>Verified vendors only</span>
            </label>
          </div>
        </details>
      </div>
    );
  }
  return (
    <main className={workspace ? "category-main category-page workspace-marketplace" : "category-main"}>
      <div className="category-container">
        {!workspace && <nav className="category-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          {category ? (
            <>
              <Link href="/categories">Packaging</Link>
              <span>/</span>
              <span aria-current="page">{category}</span>
            </>
          ) : (
            <span aria-current="page">Packaging</span>
          )}
        </nav>}
        <header className="category-intro">
          <div>
            <span className="category-eyebrow">
              <span />
              THE PACKAGING COLLECTION
            </span>
            <h1>{workspace ? "Marketplace" : title}</h1>
            <p>{workspace ? "Find your everyday essentials. Pack better, ship happier." : "Considered essentials. A better fit for every dispatch."}</p>
          </div>
          <div className="category-intro-meta">
            <span>
              <Icon name="box" size={19} />
              {scoped.length} {scoped.length === 1 ? "product" : "products"}
            </span>
            <span>
              {vendorOptions.length}{" "}
              {vendorOptions.length === 1 ? "vendor" : "vendors"} · Wholesale
              pack sizes
            </span>
          </div>
        </header>
        <div className="category-layout">
          <aside className="category-sidebar" aria-label="Product filters">
            {filters()}
          </aside>
          <section className="category-results" aria-label={workspace ? "Marketplace products" : "Category products"}>
            <div className="category-toolbar">
              <label className="category-search">
                <Icon name="search" size={18} />
                <input
                  type="search"
                  aria-label={workspace ? "Search marketplace" : "Search this category"}
                  placeholder={workspace ? "Search products, categories, materials or SKU…" : "Search this collection…"}
                  value={query}
                  onChange={(event) => update({ q: event.target.value })}
                />
                {query && (
                  <button
                    aria-label={workspace ? "Clear marketplace search" : "Clear category search"}
                    onClick={() => update({ q: "" })}
                  >
                    <Icon name="close" size={15} />
                  </button>
                )}
              </label>
              <div className="category-toolbar-actions">
                <button
                  className="category-mobile-filter"
                  onClick={() => setMobileFilters(true)}
                >
                  <Icon name="sliders" size={17} />
                  Filters{activeCount > 0 && <span>{activeCount}</span>}
                </button>
                <button
                  className="category-compare-button"
                  disabled={selected.length < 2}
                  onClick={() => setComparing(true)}
                  title="Select two to four products to compare"
                >
                  <Icon name="layers" size={16} />
                  Compare ({selected.length})
                </button>
                <label className="category-sort">
                  <span>Sort by</span>
                  <select
                    aria-label="Sort products"
                    value={sort}
                    onChange={(event) =>
                      update({
                        sort:
                          event.target.value === "featured"
                            ? ""
                            : event.target.value,
                      })
                    }
                  >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                    <option value="newest">Newest first</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="category-results-meta">
              <p role="status">
                Showing <strong>{shown.length}</strong> of {scoped.length}{" "}
                products
              </p>
              {activeCount > 0 && (
                <button className="category-clear-results" onClick={reset}>
                  Clear filters <Icon name="close" size={13} />
                </button>
              )}
              <span>Select up to 4 products to compare</span>
            </div>
            {activeCount > 0 && (
              <div className="category-active-filters">
                {workspace && category && <button onClick={() => chooseCategory("")}>{category}<Icon name="close" size={12} /></button>}
                {query && (
                  <button onClick={() => update({ q: "" })}>
                    Search: {query}
                    <Icon name="close" size={12} />
                  </button>
                )}
                {min && (
                  <button onClick={() => update({ min: "" })}>
                    From {money(minPrice)}
                    <Icon name="close" size={12} />
                  </button>
                )}
                {max && (
                  <button onClick={() => update({ max: "" })}>
                    Up to {money(maxPrice)}
                    <Icon name="close" size={12} />
                  </button>
                )}
                {[
                  { key: "size", values: sizes },
                  { key: "spec", values: specifications },
                  { key: "pack", values: packs },
                  { key: "vendor", values: vendors },
                ].flatMap((group) =>
                  group.values.map((value) => (
                    <button
                      key={group.key + value}
                      onClick={() => toggle(group.key, value)}
                    >
                      {value}
                      {group.key === "pack" ? " pieces" : ""}
                      <Icon name="close" size={12} />
                    </button>
                  )),
                )}
                {inStock && (
                  <button onClick={() => update({ stock: "" })}>
                    In stock
                    <Icon name="close" size={12} />
                  </button>
                )}
                {verified && (
                  <button onClick={() => update({ verified: "" })}>
                    Verified vendors
                    <Icon name="close" size={12} />
                  </button>
                )}
              </div>
            )}
            <div className="category-product-grid">
              {shown.map((product) => (
                <div className="category-product" key={product.id}>
                  <ProductCard product={product} />
                  <label className="category-compare-option">
                    <input
                      type="checkbox"
                      aria-label={"Compare " + product.name}
                      checked={selected.includes(product.id)}
                      disabled={
                        selected.length >= 4 && !selected.includes(product.id)
                      }
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(product.id)
                            ? current.filter((id) => id !== product.id)
                            : [...current, product.id],
                        )
                      }
                    />
                    <span>Compare</span>
                  </label>
                </div>
              ))}
            </div>
            {!shown.length && (
              <div className="category-empty">
                <span>
                  <Icon name="search" size={27} />
                </span>
                <h2>No products found</h2>
                <p>
                  Try a different search or give your filters a little more
                  room.
                </p>
                <button className="category-reset-search" onClick={reset}>
                  Reset search <Icon name="arrow" size={16} />
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
      {mobileFilters && (
        <Dialog
          title="Refine your search"
          onClose={() => setMobileFilters(false)}
        >
          <div className="category-filter-dialog">
            {filters()}
            <button
              className="category-apply-filters"
              onClick={() => setMobileFilters(false)}
            >
              Show {shown.length} {shown.length === 1 ? "product" : "products"}{" "}
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </Dialog>
      )}
      {comparing && (
        <Dialog
          title="Compare products"
          wide
          onClose={() => setComparing(false)}
        >
          <div className="category-comparison">
            <p>Compare the details that matter for your next dispatch.</p>
            <div className="category-comparison-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Product details</th>
                    {compared.map((product) => (
                      <th scope="col" key={product.id}>
                        <img src={product.image} alt="" />
                        <Link href={"/product/" + product.id}>
                          {product.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "Price per piece",
                      value: (product: Product) => priceRange(product),
                    },
                    {
                      label: "Pieces per pack",
                      value: (product: Product) => String(product.packSize),
                    },
                    {
                      label: "Sizes",
                      value: (product: Product) => product.sizes.join(", "),
                    },
                    {
                      label: "Specification",
                      value: (product: Product) => product.specification,
                    },
                    {
                      label: "Vendor",
                      value: (product: Product) => product.vendor,
                    },
                    {
                      label: "Stock (cartons)",
                      value: (product: Product) => String(product.stock),
                    },
                    {
                      label: "Dispatch time",
                      value: (product: Product) =>
                        product.dispatchDays + " days",
                    },
                  ].map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {compared.map((product) => (
                        <td key={product.id}>{row.value(product)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="category-clear-comparison"
              onClick={() => {
                setSelected([]);
                setComparing(false);
              }}
            >
              Clear comparison
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
