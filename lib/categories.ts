import type { Product } from "./types";

export function categorySlug(name: string) {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}
export function categoryHref(name: string) {
  return "/categories/" + encodeURIComponent(categorySlug(name));
}
export function categorySummaries(products: Product[]) {
  const groups = new Map<
    string,
    { name: string; slug: string; count: number; image: string }
  >();
  for (const product of products) {
    const slug = categorySlug(product.category);
    const group = groups.get(slug);
    if (group) group.count++;
    else
      groups.set(slug, {
        name: product.category,
        slug,
        count: 1,
        image: product.image,
      });
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export function startingPrice(product: Product) {
  return Math.min(product.price, ...product.tiers.map((tier) => tier.price));
}
