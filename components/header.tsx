"use client";
import Link from "next/link";
import CartLink from "./cart-link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/types";
import { Icon, MargynLogo } from "./icons";
export default function Header({ user }: { user: User | null }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const result = await fetch("/api/auth/logout", { method: "POST" });
      if (!result.ok) throw new Error("Could not sign out. Please try again.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className="white-header">
      <div className="white-header-inner">
        <Link href="/" aria-label="Margyn home">
          <MargynLogo />
        </Link>
        <nav className="white-header-nav" aria-label="Main navigation">
          <Link href="/#catalog">Marketplace</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/tools">
            Seller toolkit <span className="nav-new-dot" />
          </Link>
          <Link href="/#why-margyn">Why Margyn</Link>
        </nav>
        <div className="white-header-actions">
          <CartLink />
          <span className="header-action-divider" />
          {user ? (
            <>
              <Link href="/orders" className="white-orders-link">
                My orders
              </Link>
              <Link
                href="/profile"
                className="white-profile-link"
                aria-label="Your profile"
                title="Your profile"
              >
                <Icon name="user" size={19} />
              </Link>
              {user.role === "admin" && (
                <Link className="white-login-link" href="/admin">
                  <Icon name="grid" size={16} />
                  Admin
                </Link>
              )}
              <button
                className="white-logout"
                aria-label="Log out"
                onClick={logout}
                disabled={busy}
              >
                <Icon name="logout" size={18} />
                <span>{busy ? "Signing out…" : "Log out"}</span>
              </button>
            </>
          ) : (
            <Link className="white-login-link" href="/login">
              <Icon name="user" size={16} />
              Login / Sign up <Icon name="arrow" size={15} />
            </Link>
          )}
        </div>
      </div>
      {error && (
        <p className="error header-error" role="alert">
          {error}
        </p>
      )}
    </header>
  );
}
