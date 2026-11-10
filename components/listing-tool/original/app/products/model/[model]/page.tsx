import SavedProducts from "@/components/listing-tool/original/components/ProductForm/SavedProducts";

type ModelProductsPageProps = {
  params: Promise<{ model: string }>;
};

export default async function ModelProductsPage({ params }: ModelProductsPageProps) {
  const { model } = await params;
  let decodedModel = model;

  try {
    decodedModel = decodeURIComponent(model);
  } catch {
    decodedModel = model;
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <SavedProducts initialModel={decodedModel} />
      </div>
    </main>
  );
}
