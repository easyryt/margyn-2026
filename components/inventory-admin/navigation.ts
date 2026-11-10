"use client";
import { useMemo } from "react";
import { useRouter as useNextRouter } from "next/navigation";
export { useSearchParams, usePathname, useParams, notFound, redirect } from "next/navigation";
export function inventoryHref(href: string) {
  return /^\/dashboard(?:[/?#]|$)/.test(href) ? "/tools/inventory-admin" + href.slice("/dashboard".length) : href;
}
export function useRouter() {
  const router = useNextRouter();
  return useMemo(() => ({ ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(inventoryHref(href), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(inventoryHref(href), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(inventoryHref(href), options),
  }), [router]);
}
