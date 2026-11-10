import type { Metadata } from "next";

import CharmBatchBuilder from "@/components/listing-tool/original/components/CharmBatchBuilder";

export const metadata: Metadata = {
  title: "Charm Batch Builder",
  description:
    "Select stored charms across multiple phone models and export one Meesho workbook.",
};

export default function CharmBatchPage() {
  return <CharmBatchBuilder />;
}
