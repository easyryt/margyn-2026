import { selectedProductTitle, type GeneralProductSelections } from "./general-product-listing";

type VariantInput = GeneralProductSelections & {
  parentTitle: string;
  provider: "gemini" | "openai";
  color: string;
  material: string;
  includedComponents: string;
};

export async function generateGeneralProductVariantTitles({
  input,
  requested,
  usedTitles,
  preparedTitles = [],
  onProgress,
  fetcher = fetch,
}: {
  input: VariantInput;
  requested: number;
  usedTitles: string[];
  preparedTitles?: string[];
  onProgress: (titles: string[]) => void;
  fetcher?: typeof fetch;
}) {
  if (!Number.isInteger(requested) || requested < 1 || requested > 50) {
    throw new Error("Enter between 1 and 50 additional variants.");
  }

  const generated: string[] = [];
  const excluded = new Set([input.parentTitle, ...usedTitles].map((title) => title.toLowerCase().trim()));
  for (const title of preparedTitles) {
    const valid = selectedProductTitle(title, input);
    if (!valid || excluded.has(valid.toLowerCase())) {
      throw new Error("Review the saved variant titles: each must be unique and match the product type and pack quantity.");
    }
    generated.push(valid);
    excluded.add(valid.toLowerCase());
  }

  onProgress([...generated]);
  // Allow extra partial batches without an unbounded, chargeable retry loop.
  const maxRequests = Math.ceil(Math.max(0, requested - generated.length) / 10) + 3;
  try {
    for (let attempt = 0; generated.length < requested && attempt < maxRequests; attempt += 1) {
      const count = Math.min(10, requested - generated.length);
      const response = await fetcher("/api/tools/listing-tool/ai/general-product-variant-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, count, usedTitles: [...usedTitles, ...generated] }),
      });
      const body: unknown = await response.json().catch(() => null);
      const result = body && typeof body === "object"
        ? body as { titles?: unknown; error?: unknown; warning?: unknown }
        : {};
      const before = generated.length;
      if (Array.isArray(result.titles)) {
        for (const value of result.titles) {
          const title = selectedProductTitle(value, input);
          if (title && !excluded.has(title.toLowerCase()) && generated.length < requested) {
            generated.push(title);
            excluded.add(title.toLowerCase());
          }
        }
      }
      onProgress([...generated]);
      if (!response.ok || generated.length === before) {
        throw new Error(typeof result.error === "string"
          ? result.error
          : "AI returned no new valid titles. Try again or switch AI provider.");
      }
    }
    if (generated.length < requested) {
      throw new Error("AI needs another attempt to finish the remaining titles.");
    }
    return generated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate variant titles.";
    throw new Error(generated.length
      ? `${message} ${generated.length} of ${requested} titles are saved. Click Continue generating to finish, or create the saved variants now.`
      : message);
  }
}
