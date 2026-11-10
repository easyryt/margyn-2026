"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { inventoryHref } from "./navigation";
export default function InventoryLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const mapped = typeof href === "string" ? inventoryHref(href) : { ...href, pathname: href.pathname ? inventoryHref(href.pathname) : href.pathname };
  return <NextLink {...props} href={mapped} />;
}
