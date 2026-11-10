"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function CartLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      fetch("/api/cart", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (active && data) setCount(data.cart.cartons);
        })
        .catch(() => {});
    void refresh();
    window.addEventListener("margyn:cart", refresh);
    return () => {
      active = false;
      window.removeEventListener("margyn:cart", refresh);
    };
  }, []);
  return (
    <Link
      href="/cart"
      className="cart-header-link"
      aria-label={`Cart, ${count} cartons`}
    >
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path
          d="M2 3h3l3 13h11l3-10H6M10 21h.01M18 21h.01"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="cart-count">{count}</span>
    </Link>
  );
}
