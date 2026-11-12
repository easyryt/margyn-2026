import ImageStudioFrame from "@/components/image-generator/frame";
import ImageGeneratorHome from "@/components/image-generator/home";
import { notFound } from "next/navigation";
import { SellerToolWorkspace } from "@/components/seller-tools-dashboard";
import ShippingLabels from "@/components/shipping-labels";
import { SELLER_TOOLS, toolPath } from "@/lib/seller-tools";
import { requireToolUser } from "@/lib/tool-auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return {
    title: SELLER_TOOLS.find((tool) => tool.id === slug)?.name || "Seller tool",
  };
}
export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = SELLER_TOOLS.find((item) => item.id === slug);
  if (!tool) notFound();
  await requireToolUser(toolPath(tool.id));
  if (tool.id === "image-generator")
    return (
      <ImageStudioFrame mode="start">
        <ImageGeneratorHome />
      </ImageStudioFrame>
    );
  return tool.id === "shipping-labels" ? (
    <ShippingLabels />
  ) : (
    <SellerToolWorkspace tool={tool} />
  );
}
