import { notFound } from "next/navigation";
import { requireToolUser } from "@/lib/tool-auth";
import { IMAGE_GENERATOR_MODES } from "@/lib/image-generator/modes";
import ImageStudioFrame from "@/components/image-generator/frame";
import Covers from "@/components/image-generator/views/covers";
import Charms from "@/components/image-generator/views/charms";
import Packs from "@/components/image-generator/views/charm-packs";
import Backgrounds from "@/components/image-generator/views/backgrounds";
import Enhance from "@/components/image-generator/views/enhance";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Props = { params: Promise<{ slug: string; view: string }> };
export async function generateMetadata({ params }: Props) {
  const { view } = await params;
  const mode = IMAGE_GENERATOR_MODES.find((item) => item.id === view);
  return {
    title: mode ? mode.label + " · Image Generator" : "Image Generator",
  };
}
export default async function ImageToolModePage({ params }: Props) {
  const { slug, view } = await params;
  const mode = IMAGE_GENERATOR_MODES.find((item) => item.id === view);
  if (slug !== "image-generator" || !mode) notFound();
  await requireToolUser(mode.path);
  const content =
    mode.id === "covers" ? (
      <Covers />
    ) : mode.id === "charms" ? (
      <Charms />
    ) : mode.id === "charm-packs" ? (
      <Packs />
    ) : mode.id === "backgrounds" ? (
      <Backgrounds />
    ) : (
      <Enhance />
    );
  return <ImageStudioFrame mode={mode.id}>{content}</ImageStudioFrame>;
}
