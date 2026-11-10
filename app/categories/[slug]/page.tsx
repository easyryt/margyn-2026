import { notFound } from "next/navigation";
import { currentUser, listProducts } from "@/lib/api";
import { categorySummaries } from "@/lib/categories";
import CategoryShell from "@/components/category-shell";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = categorySummaries(await listProducts()).find(
    (item) => item.slug === slug.toLowerCase(),
  );
  return {
    title: category?.name || "Category not found",
    description: category
      ? "Shop " +
        category.name.toLowerCase() +
        " on Margyn. Filter by price, size and pack quantity."
      : undefined,
  };
}
export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [user, products] = await Promise.all([currentUser(), listProducts()]);
  const category = categorySummaries(products).find(
    (item) => item.slug === slug.toLowerCase(),
  );
  if (!category) notFound();
  return (
    <CategoryShell user={user} products={products} category={category.name} />
  );
}
