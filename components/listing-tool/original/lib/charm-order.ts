type CharmVersionFields = {
  sourceKind?: "parent" | "variant";
  sourceVariantNumber?: unknown;
  variantNumber?: unknown;
  version?: unknown;
  sku?: string;
};

type CharmFamilyFields = CharmVersionFields & {
  id: string;
  designNumber?: string;
  styleId?: string;
};

function positiveVersion(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export function charmVariantNumber(charm: CharmVersionFields) {
  if (charm.sourceKind === "parent") return 1;

  const sourceNumber = positiveVersion(charm.sourceVariantNumber);
  if (charm.sourceKind === "variant" && sourceNumber !== undefined && sourceNumber >= 2) {
    return sourceNumber;
  }

  const skuMatch = String(charm.sku ?? "").trim().match(/(?:^|[.\-])V(\d+)$/i);
  const skuNumber = skuMatch ? positiveVersion(skuMatch[1]) : undefined;
  if (skuNumber !== undefined) return skuNumber;

  const legacyNumber = positiveVersion(charm.variantNumber);
  if (legacyNumber !== undefined) return legacyNumber;

  const versionMatch = String(charm.version ?? "").trim().match(/^V?(\d+)$/i);
  return versionMatch ? positiveVersion(versionMatch[1]) : undefined;
}

export function isParentCharm(charm: CharmVersionFields) {
  if (charm.sourceKind === "parent") return true;
  if (charm.sourceKind === "variant") return false;
  return charmVariantNumber(charm) === 1;
}

export function sortCharmsByVersion<T extends CharmVersionFields>(charms: readonly T[]): T[] {
  // Sort a copy; equal or unknown versions retain their original order.
  return [...charms].sort((first, second) => {
    const firstParent = isParentCharm(first);
    const secondParent = isParentCharm(second);
    if (firstParent !== secondParent) return firstParent ? -1 : 1;

    const firstNumber = charmVariantNumber(first);
    const secondNumber = charmVariantNumber(second);
    if (firstNumber === secondNumber) return 0;
    if (firstNumber === undefined) return 1;
    if (secondNumber === undefined) return -1;
    return firstNumber - secondNumber;
  });
}

function charmFamilyKey(charm: CharmFamilyFields) {
  const designNumber = String(charm.designNumber ?? "").trim().toLocaleLowerCase();
  if (designNumber) return `design:${designNumber}`;

  const skuFamily = String(charm.sku || charm.styleId || "")
    .trim()
    .replace(/(?:^|[.\-])V\d+$/i, "")
    .toLocaleLowerCase();
  return skuFamily ? `sku:${skuFamily}` : `orphan:${charm.id}`;
}

export function groupCharmsByFamily<T extends CharmFamilyFields>(
  charms: readonly T[],
): [string, T[]][] {
  const grouped = new Map<string, T[]>();
  for (const charm of charms) {
    const key = charmFamilyKey(charm);
    const family = grouped.get(key);
    if (family) family.push(charm);
    else grouped.set(key, [charm]);
  }
  // Preserve design order while keeping V1, V2, ... V10 together in each design.
  return [...grouped.entries()].map(([key, items]) => [key, sortCharmsByVersion(items)]);
}
