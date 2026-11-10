import CharmManager from "@/components/listing-tool/original/components/CharmManager";

export default async function CharmDesignPage({
  params,
  searchParams,
}: {
  params: Promise<{ designNumber: string }>;
  searchParams: Promise<{ productId?: string | string[] }>;
}) {
  const [{ designNumber }, query] = await Promise.all([params, searchParams]);
  const productId = typeof query.productId === "string" ? query.productId : undefined;

  return <CharmManager designNumber={designNumber} productId={productId} />;
}
