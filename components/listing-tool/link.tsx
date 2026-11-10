"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { listingHref } from "./navigation";
export default function ListingLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const mapped = typeof href === "string" ? listingHref(href) : { ...href, pathname: href.pathname ? listingHref(href.pathname) : href.pathname };
  return <NextLink {...props} href={mapped} />;
}
