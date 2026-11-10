import type { Metadata } from "next";

import ProductCard from "@/components/listing-tool/original/components/ProductForm/ProductCard";

export const metadata: Metadata = {
  title: "Create Product",
  description:
    "Create a product, prepare variants, review the batch, and save or export it.",
};

export default function CreateProductPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <ProductCard />
      </div>
    </main>
  );
}
