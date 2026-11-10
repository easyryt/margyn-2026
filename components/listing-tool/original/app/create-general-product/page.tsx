import type { Metadata } from "next";

import GeneralProductBuilder from "@/components/listing-tool/original/components/GeneralProductBuilder";

export const metadata: Metadata = {
  title: "Create General Product",
  description: "Create AI-assisted non-phone product listings and variants.",
};

export default async function CreateGeneralProductPage({ searchParams }: {
  searchParams: Promise<{ productId?: string | string[]; step?: string | string[] }>;
}) {
  const { productId, step } = await searchParams;
  const savedProductId = typeof productId === "string" ? productId : undefined;
  return <GeneralProductBuilder key={`${savedProductId || "new"}:${step === "variants" ? "variants" : "edit"}`} savedProductId={savedProductId} initialStep={step === "variants" ? 3 : 4} />;
}
