"use client";
import { useMemo } from "react";
import { useRouter as useNextRouter } from "next/navigation";
export { useSearchParams, usePathname, useParams, notFound, redirect } from "next/navigation";
export const LISTING_ROOT = "/tools/listing-tool";
export function listingHref(href: string) {
  if (href === "/" || href.startsWith("/?") || href.startsWith("/#")) return LISTING_ROOT + href.slice(1);
  return /^\/(?:products|create-product|charms|general-products|create-general-product)(?:[/?#]|$)/.test(href) ? LISTING_ROOT + href : href;
}
export function useRouter() {
  const router = useNextRouter();
  return useMemo(() => ({ ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(listingHref(href), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(listingHref(href), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(listingHref(href), options),
  }), [router]);
}
