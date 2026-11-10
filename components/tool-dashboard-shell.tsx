"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@/lib/types";
import { SELLER_TOOLS, toolPath } from "@/lib/seller-tools";
import { Icon, MargynLogo } from "./icons";
import CartLink from "./cart-link";
import SubscriptionUsage from "./subscription-usage";

function SidebarContent({
  user,
  pathname,
  onNavigate,
  onLogout,
  busy,
}: {
  user: User;
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  busy: boolean;
}) {
  return (
    <>
      <Link
        href="/tools"
        className="tools-sidebar-logo"
        aria-label="Margyn tools home"
        onClick={onNavigate}
      >
        <MargynLogo />
      </Link>
      <div className="tools-workspace-label">
        <span>
          <Icon name="grid" size={17} />
        </span>
        <div>
          Seller workspace<small>Your everyday business tools</small>
        </div>
      </div>
      <span className="tools-sidebar-caption">WORKSPACE</span>
      <nav className="tools-overview-nav" aria-label="Workspace navigation">
        <Link
          href="/tools"
          aria-current={pathname === "/tools" ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="grid" size={18} />
          Dashboard
        </Link>
        <Link href="/tools/marketplace" aria-current={pathname === "/tools/marketplace" ? "page" : undefined} onClick={onNavigate}>
          <Icon name="box" size={18} />
          Marketplace
        </Link>
      </nav>
      <nav className="tools-overview-nav" aria-label="Account navigation"><Link href="/tools/subscription" aria-current={pathname === "/tools/subscription" ? "page" : undefined} onClick={onNavigate}><Icon name="tag" size={18} />AI plans</Link></nav>
      <span className="tools-sidebar-caption">SELLER TOOLS</span>
      <nav className="tools-sidebar-nav" aria-label="Seller tool navigation">
        {SELLER_TOOLS.map((tool) => (
          <Link
            key={tool.id}
            href={toolPath(tool.id)}
            aria-label={tool.name}
            aria-description={tool.available ? "Available now" : "Coming soon"}
            aria-current={
              pathname === toolPath(tool.id) ||
              pathname.startsWith(toolPath(tool.id) + "/")
                ? "page"
                : undefined
            }
            onClick={onNavigate}
          >
            <Icon name={tool.icon} size={18} />
            <span>{tool.name}</span>
            {tool.available ? (
              <i className="tools-nav-live" title="Available" />
            ) : (
              <small>Soon</small>
            )}
          </Link>
        ))}
      </nav>
      <div className="tools-sidebar-store">
        <Icon name="box" size={23} />
        <strong>Stock up for your next dispatch.</strong>
        <p>Your packaging essentials are a click away.</p>
        <Link href="/tools/marketplace" onClick={onNavigate}>
          Visit marketplace <Icon name="external" size={13} />
        </Link>
      </div>
      <div className="tools-sidebar-bottom">
        <Link href="/profile" onClick={onNavigate}>
          <span className="tools-account-avatar">
            <Icon name="user" size={17} />
          </span>
          <span>
            {user.name || "Your account"}
            <small>Profile & addresses</small>
          </span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          disabled={busy}
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    </>
  );
}
function MobileSidebar({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="tools-mobile-drawer"
      aria-label="Tool menu"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <button
        type="button"
        className="tools-drawer-close"
        onClick={onClose}
        aria-label="Close tool menu"
      >
        <Icon name="close" size={19} />
      </button>
      <div className="tools-sidebar-content">{children}</div>
    </dialog>
  );
}
export default function ToolDashboardShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = SELLER_TOOLS.find(
    (tool) =>
      pathname === toolPath(tool.id) ||
      pathname.startsWith(toolPath(tool.id) + "/"),
  );
  const title = pathname === "/tools/subscription" ? "AI plans" : pathname === "/tools/marketplace" ? "Marketplace" : current?.name || "Dashboard";
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok)
        throw new Error("Could not sign out. Please try again.");
      setMenuOpen(false);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  const sidebar = (mobile = false) => (
    <SidebarContent
      user={user}
      pathname={pathname}
      onNavigate={mobile ? () => setMenuOpen(false) : undefined}
      onLogout={() => void logout()}
      busy={busy}
    />
  );
  return (
    <div className="tools-shell margyn-landing">
      <aside className="tools-desktop-sidebar" aria-label="Tool sidebar">
        <div className="tools-sidebar-content">{sidebar()}</div>
      </aside>
      {menuOpen && (
        <MobileSidebar onClose={() => setMenuOpen(false)}>
          {sidebar(true)}
        </MobileSidebar>
      )}
      <div className="tools-shell-main" id="tool-content">
        <header className="tools-topbar">
          <div>
            <button
              type="button"
              className="tools-menu-toggle"
              onClick={() => setMenuOpen(true)}
              aria-label="Open tool menu"
              aria-expanded={menuOpen}
            >
              <Icon name="menu" size={21} />
            </button>
            <nav aria-label="Breadcrumb">
              <Link href="/tools">Workspace</Link>
              <span>/</span>
              <span>{title}</span>
            </nav>
          </div>
          <div className="tools-topbar-actions">
            <SubscriptionUsage compact />
            <Link href="/tools/marketplace" className="tools-topbar-store">
              Marketplace <Icon name="external" size={13} />
            </Link>
            <CartLink />
            <span className="tools-topbar-divider" />
            <Link
              href="/profile"
              className="tools-topbar-profile"
              aria-label="Your profile"
              title="Your profile"
            >
              <Icon name="user" size={18} />
            </Link>
          </div>
        </header>
        {error && (
          <p role="alert" className="tools-shell-error">
            {error}
          </p>
        )}
        <div className="tools-content-outlet">{children}</div>
      </div>
    </div>
  );
}
