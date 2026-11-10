import SavedProducts from "@/components/listing-tool/original/components/ProductForm/SavedProducts";
import ProductImport from "@/components/listing-tool/original/components/ProductImport";

export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6">
          <ProductImport compact />
        </div>
        <SavedProducts />
      </div>
    </main>
  );
}
