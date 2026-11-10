"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import type {
  AnnouncementSettings,
  PromoBannerSettings,
  Product,
  User,
} from "@/lib/types";
import { Icon, Logo } from "./icons";
import Dialog from "./dialog";
import ProductEditor from "./product-editor";
import AdminOrders from "./admin-orders";
import AdminCoupons from "./admin-coupons";
import AdminSubscriptions from "./admin-subscriptions";
import AdminAnnouncement from "./admin-announcement";
import AdminPromoBanner from "./admin-promo-banner";
import { money } from "./storefront";
const subscribeToHydration = () => () => {};
export default function AdminPanel({
  user,
  initialProducts,
  initialUsers,
  initialAnnouncement,
  initialPromoBanner,
}: {
  user: User;
  initialProducts: Product[];
  initialUsers: User[];
  initialAnnouncement: AnnouncementSettings;
  initialPromoBanner: PromoBannerSettings;
}) {
  const router = useRouter();
  const clientReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [tab, setTab] = useState("overview");
  const [announcement, setAnnouncement] = useState(initialAnnouncement);
  const [promoBanner, setPromoBanner] = useState(initialPromoBanner);
  const [products, setProducts] = useState(initialProducts);
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const published = products.filter((p) => p.status === "published").length;
  const lowStock = products.filter((p) => p.stock < 20);
  const customers = users.filter((u) => u.role === "customer");
  const shown = useMemo(
    () =>
      products.filter(
        (p) =>
          (status === "all" || p.status === status) &&
          `${p.name} ${p.sku} ${p.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [products, query, status],
  );
  const shownUsers = users.filter((u) => u.phone.includes(query));
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const responses = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);
      const data = await Promise.all(
        responses.map((response) => response.json()),
      );
      if (responses.some((response) => !response.ok))
        throw new Error(
          data.find((item) => item.error)?.error || "Could not refresh data.",
        );
      setProducts(data[0].products);
      setUsers(data[1].users);
      setNotice("Your catalog is up to date.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not delete the product.");
      setProducts((items) => items.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      setNotice("Product deleted from your catalog.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function saved(product: Product) {
    setProducts((items) => [
      product,
      ...items.filter((item) => item.id !== product.id),
    ]);
    setEditing(undefined);
    setNotice(
      product.status === "published"
        ? "Product saved and published to the storefront."
        : "Draft saved. Publish it when you’re ready.",
    );
  }
  const headings: Record<string, string[]> = {
    subscriptions: ["Tokens & subscriptions", "Set an allowance, choose a plan and keep AI usage in view."],
    promo: [
      "Your promotional banner.",
      "Make the space above your footer your own.",
    ],
    banner: [
      "Your announcement banner.",
      "Make your latest message part of every visit.",
    ],
    overview: [
      "A little overview.",
      "Here’s what’s happening with your marketplace.",
    ],
    products: [
      "Your product catalog.",
      "A home for everything you pack, protect and ship.",
    ],
    orders: [
      "Your order requests.",
      "Review requests, manage status and track stock.",
    ],
    coupons: [
      "A little more incentive.",
      "Manage checkout offers and coupon codes.",
    ],
    customers: [
      "Your growing community.",
      "Verified accounts that have joined your marketplace.",
    ],
  };
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-logo">
          <Logo />
        </Link>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Icon name="box" size={18} />
          </span>
          <span>
            MARGYN workspace<small>Store administration</small>
          </span>
          <span className="green-dot" />
        </div>
        <p className="sidebar-label">YOUR WORKSPACE</p>
        <nav aria-label="Admin navigation">
          {[
            { id: "overview", name: "Overview", icon: "grid" },
            { id: "products", name: "Products", icon: "box" },
            { id: "orders", name: "Orders", icon: "layers" },
            { id: "coupons", name: "Coupons", icon: "tag" },
            { id: "customers", name: "Customers", icon: "user" },
            { id: "subscriptions", name: "Tokens & subscriptions", icon: "tag" },
            { id: "banner", name: "Announcement banner", icon: "spark" },
            { id: "promo", name: "Promotional banner", icon: "box" },
          ].map((item) => (
            <button
              key={item.id}
              disabled={!clientReady}
              className={tab === item.id ? "active" : ""}
              onClick={() => {
                setTab(item.id);
                setQuery("");
                setStatus("all");
                setError("");
                setNotice("");
              }}
            >
              <Icon name={item.icon} size={19} />
              {item.name}
              {item.id === "products" && <span>{products.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-store">
          <span className="sidebar-store-art">
            <Icon name="spark" size={28} />
          </span>
          <strong>See it from the other side.</strong>
          <p>Take a look at your live storefront.</p>
          <Link
            href="/"
            target="_blank"
            className="button button-outline button-small"
          >
            Visit marketplace <Icon name="external" size={14} />
          </Link>
        </div>
        <div className="admin-account">
          <Link
            href="/profile"
            className="admin-avatar"
            aria-label="Your profile"
          >
            <Icon name="user" size={16} />
          </Link>
          <div>
            <strong>Store administrator</strong>
            <small className="admin-profile-name">
              {user.name || "Your profile"}
            </small>
          </div>
          <button
            className="icon-button"
            aria-label="Log out"
            disabled={busy}
            onClick={logout}
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="muted">Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{tab[0].toUpperCase() + tab.slice(1)}</strong>
          </div>
          <Link href="/" target="_blank">
            View store <Icon name="external" size={15} />
          </Link>
        </header>
        <main className="admin-content">
          <div className="admin-heading">
            <div>
              <p className="eyebrow">YOUR BUSINESS, AT A GLANCE</p>
              <h1>{headings[tab][0]}</h1>
              <p>{headings[tab][1]}</p>
            </div>
            {tab !== "subscriptions" && <button
              className="button button-orange"
              onClick={() => setEditing(null)}
            >
              <Icon name="plus" size={19} />
              Add product
            </button>}
          </div>
          {notice && (
            <div className="success-notice" role="status">
              <Icon name="check" size={18} />
              {notice}
              <button
                className="icon-button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
          {error && !deleting && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {tab === "overview" && (
            <>
              <div className="stat-grid">
                {[
                  {
                    name: "Total products",
                    value: products.length,
                    note: "Across your entire catalog",
                    icon: "box",
                  },
                  {
                    name: "Published",
                    value: published,
                    note: `${products.length - published} saved as drafts`,
                    icon: "layers",
                  },
                  {
                    name: "Low stock",
                    value: lowStock.length,
                    note: "Products with fewer than 20 units",
                    icon: "tag",
                  },
                  {
                    name: "Customer accounts",
                    value: customers.length,
                    note: "Verified with a phone number",
                    icon: "user",
                  },
                ].map((stat) => (
                  <article className="stat-card" key={stat.name}>
                    <div>
                      <span>{stat.name}</span>
                      <Icon name={stat.icon} size={19} />
                    </div>
                    <strong>{stat.value.toString().padStart(2, "0")}</strong>
                    <p>{stat.note}</p>
                  </article>
                ))}
              </div>
              <div className="admin-welcome">
                <div>
                  <span className="admin-welcome-kicker">
                    MAKE ROOM FOR YOUR NEXT BESTSELLER
                  </span>
                  <h2>
                    Good products deserve
                    <br />a great place to shine.
                  </h2>
                  <p>
                    Add a photo, set your price, and you’re ready to publish.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setEditing(null)}
                  >
                    Add your next product <Icon name="arrow" size={17} />
                  </button>
                </div>
                <div className="welcome-box">
                  <Icon name="box" size={100} />
                  <span>MARGYN.</span>
                </div>
              </div>
            </>
          )}
          {tab === "subscriptions" ? (
            <AdminSubscriptions />
          ) : tab === "promo" ? (
            <AdminPromoBanner settings={promoBanner} onSaved={setPromoBanner} />
          ) : tab === "banner" ? (
            <AdminAnnouncement
              settings={announcement}
              onSaved={setAnnouncement}
            />
          ) : tab === "orders" ? (
            <AdminOrders />
          ) : tab === "coupons" ? (
            <AdminCoupons />
          ) : tab !== "customers" ? (
            <section className="admin-table-section">
              <div className="admin-table-title">
                <div>
                  <h2>
                    {tab === "overview" ? "Your catalog" : "All products"}{" "}
                    <span>{products.length}</span>
                  </h2>
                  <p>Manage what your customers see in the marketplace.</p>
                </div>
                <button
                  className="text-button"
                  onClick={refresh}
                  disabled={busy}
                >
                  {busy ? "Refreshing…" : "Refresh data"}
                  <Icon name="layers" size={16} />
                </button>
              </div>
              <div className="admin-table-controls">
                <label className="search-field">
                  <Icon name="search" size={18} />
                  <input
                    type="search"
                    placeholder="Search by name, SKU or category…"
                    aria-label="Search admin products"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter product status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Price</th>
                      <th>Inventory</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="table-product">
                            <img src={product.image} alt="" />
                            <div>
                              <strong>{product.name}</strong>
                              <small>
                                {product.sku} · {product.category}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${product.status}`}>
                            <span />
                            {product.status === "published"
                              ? "Published"
                              : "Draft"}
                          </span>
                          {product.featured && (
                            <small className="featured-label">
                              MARGYN pick
                            </small>
                          )}
                        </td>
                        <td className="price-cell">
                          {money(product.price)}
                          <small>per {product.unit}</small>
                        </td>
                        <td>
                          <span
                            className={
                              product.stock < 20 ? "low-stock-text" : ""
                            }
                          >
                            {product.stock} CTN in stock
                          </span>
                          {product.stock < 20 && (
                            <small className="low-stock-text">
                              {product.stock === 0
                                ? "Out of stock"
                                : "Running low"}
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="icon-button"
                              aria-label={`Edit ${product.name}`}
                              onClick={() => setEditing(product)}
                            >
                              <Icon name="edit" size={17} />
                            </button>
                            <button
                              className="icon-button danger-button"
                              aria-label={`Delete ${product.name}`}
                              onClick={() => {
                                setDeleting(product);
                                setError("");
                              }}
                            >
                              <Icon name="trash" size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!shown.length && (
                  <div className="empty-state">
                    <Icon name="box" size={32} />
                    <h3>
                      {products.length
                        ? "No matching products"
                        : "Your next chapter starts here"}
                    </h3>
                    <p>
                      {products.length
                        ? "Try another search or status filter."
                        : "Add your first product to fill your storefront."}
                    </p>
                    <button
                      className="button button-outline"
                      onClick={() =>
                        products.length
                          ? (setQuery(""), setStatus("all"))
                          : setEditing(null)
                      }
                    >
                      {products.length ? "Reset filters" : "Add product"}
                    </button>
                  </div>
                )}
              </div>
              <div className="table-footer">
                <span>
                  Showing {shown.length} of {products.length} products
                </span>
                <span>
                  <span className="green-dot" /> Changes are saved to your
                  database
                </span>
              </div>
            </section>
          ) : (
            <section className="admin-table-section">
              <div className="admin-table-title">
                <div>
                  <h2>
                    Registered accounts <span>{users.length}</span>
                  </h2>
                  <p>
                    Customer and administrator accounts. All phone numbers are
                    verified at login.
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={refresh}
                  disabled={busy}
                >
                  {busy ? "Refreshing…" : "Refresh data"}
                </button>
              </div>
              <div className="admin-table-controls">
                <label className="search-field">
                  <Icon name="search" size={18} />
                  <input
                    type="search"
                    placeholder="Search by phone number…"
                    aria-label="Search customers"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Phone number</th>
                      <th>Role</th>
                      <th>Account created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownUsers.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <div className="customer-phone">
                            <Icon name="user" size={18} />
                            <strong>{account.phone}</strong>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${account.role === "admin" ? "draft" : "published"}`}
                          >
                            {account.role === "admin"
                              ? "Administrator"
                              : "Customer"}
                          </span>
                        </td>
                        <td>
                          {new Intl.DateTimeFormat("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          }).format(account.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!shownUsers.length && (
                  <div className="empty-state">
                    <h3>No matching accounts</h3>
                    <p>Try searching with a different number.</p>
                  </div>
                )}
              </div>
            </section>
          )}
          <div className="admin-bottom">
            <Logo />
            <span>A little more organized. A lot more possibility.</span>
          </div>
        </main>
      </div>
      {editing !== undefined && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(undefined)}
          onSaved={saved}
        />
      )}{" "}
      {deleting && (
        <Dialog
          title="Delete this product?"
          onClose={() => {
            if (!busy) {
              setDeleting(null);
              setError("");
            }
          }}
        >
          <p className="delete-message">
            <strong>{deleting.name}</strong> will be permanently removed from
            your catalog and storefront.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button button-outline"
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
              Keep product
            </button>
            <button
              className="button button-danger"
              onClick={remove}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete product"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
