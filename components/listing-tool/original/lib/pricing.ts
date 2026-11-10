export const DEFAULT_WRONG_DEFECTIVE_RETURN_DISCOUNT = 2;
export const DEFAULT_PRODUCT_PRICE = 191;
export const DEFAULT_CHARM_WRONG_DEFECTIVE_RETURN_DISCOUNT = 1;
export const DEFAULT_CHARM_PRICE = 196;

function getReturnDiscount(value: unknown, fallback: number) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && !value.trim())
  ) {
    return fallback;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) &&
    numericValue >= 0 &&
    numericValue <= 30
    ? numericValue
    : fallback;
}

export function getWrongDefectiveReturnDiscount(value: unknown) {
  return getReturnDiscount(
    value,
    DEFAULT_WRONG_DEFECTIVE_RETURN_DISCOUNT,
  );
}

export function getCharmWrongDefectiveReturnDiscount(value: unknown) {
  return getReturnDiscount(
    value,
    DEFAULT_CHARM_WRONG_DEFECTIVE_RETURN_DISCOUNT,
  );
}

const VARIANT_PRICE_CYCLE_LENGTH = 5;

export function getVariantPrice(basePrice: number, variantNumber: unknown) {
  const numericVariantNumber = Number(variantNumber);
  const normalizedVariantNumber =
    Number.isInteger(numericVariantNumber) && numericVariantNumber > 0
      ? numericVariantNumber
      : 1;

  return basePrice + (normalizedVariantNumber - 1) % VARIANT_PRICE_CYCLE_LENGTH;
}

export function getCharmPrice(variantNumber: unknown) {
  return getVariantPrice(DEFAULT_CHARM_PRICE, variantNumber);
}
