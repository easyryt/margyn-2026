import { currentUser, listProducts } from "@/lib/api";
import CategoryShell from "@/components/category-shell";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Shop packaging by category",
  description:
    "Browse Margyn packaging by category, price, size, pack quantity and more.",
};
export default async function CategoriesPage() {
  const [user, products] = await Promise.all([currentUser(), listProducts()]);
  return <CategoryShell user={user} products={products} />;
}
