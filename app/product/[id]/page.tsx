import { getProduct, listProducts, currentUser } from "@/lib/api";
import { notFound } from "next/navigation";
import Header from "@/components/header";
import ProductDetail from "@/components/product-detail";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const [user, products] = await Promise.all([currentUser(), listProducts()]);
  return (
    <>
      <Header user={user} />
      <ProductDetail
        product={product}
        related={products.filter((p) => p.id !== id).slice(0, 3)}
      />
    </>
  );
}
