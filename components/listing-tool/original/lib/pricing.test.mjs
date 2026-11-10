import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CHARM_PRICE,
  DEFAULT_CHARM_WRONG_DEFECTIVE_RETURN_DISCOUNT,
  DEFAULT_WRONG_DEFECTIVE_RETURN_DISCOUNT,
  getCharmPrice,
  getCharmWrongDefectiveReturnDiscount,
  getVariantPrice,
  getWrongDefectiveReturnDiscount,
} from "./pricing.ts";

test("cycles the user's base price across the parent and variants", () => {
  assert.deepEqual(
    Array.from({ length: 12 }, (_, index) => getVariantPrice(121, index + 1)),
    [121, 122, 123, 124, 125, 121, 122, 123, 124, 125, 121, 122],
  );
});

test("starts generated V2 variants one rupee above the parent", () => {
  assert.deepEqual(
    Array.from({ length: 10 }, (_, index) => getVariantPrice(121, index + 2)),
    [122, 123, 124, 125, 121, 122, 123, 124, 125, 121],
  );
});

test("cycles charm prices from 196 through 200", () => {
  assert.equal(DEFAULT_CHARM_PRICE, 196);
  assert.deepEqual(
    Array.from({ length: 12 }, (_, index) => getCharmPrice(index + 1)),
    [196, 197, 198, 199, 200, 196, 197, 198, 199, 200, 196, 197],
  );
});

test("supports arbitrary nonnegative integer, decimal and zero base prices", () => {
  for (const basePrice of [0, 1, 73, 8999, 121.5, 0.25]) {
    assert.equal(getVariantPrice(basePrice, 1), basePrice);
    assert.equal(getVariantPrice(basePrice, 2), basePrice + 1);
    assert.equal(getVariantPrice(basePrice, 5), basePrice + 4);
    assert.equal(getVariantPrice(basePrice, 6), basePrice);
  }
});

test("wraps large variant numbers and accepts numeric string indices", () => {
  assert.equal(getVariantPrice(121, 1_000_001), 121);
  assert.equal(getVariantPrice(121, 1_000_005), 125);
  assert.equal(getVariantPrice(121, "2"), 122);
  assert.equal(getVariantPrice(121, "11"), 121);
});

test("falls back to V1 for missing or invalid variant numbers", () => {
  for (const variantNumber of [undefined, null, "", "invalid", 0, -1, 1.5, NaN, Infinity]) {
    assert.equal(getVariantPrice(121, variantNumber), 121);
  }
});

test("defaults missing, blank and invalid return discounts to two rupees", () => {
  assert.equal(DEFAULT_WRONG_DEFECTIVE_RETURN_DISCOUNT, 2);
  for (const discount of [undefined, null, "", "  ", "invalid", NaN, Infinity, -1, 31]) {
    assert.equal(getWrongDefectiveReturnDiscount(discount), 2);
  }
});

test("uses a one-rupee fallback only for charm return discounts", () => {
  assert.equal(DEFAULT_CHARM_WRONG_DEFECTIVE_RETURN_DISCOUNT, 1);
  for (const discount of [undefined, null, "", "  ", "invalid", NaN, Infinity, -1, 31]) {
    assert.equal(getCharmWrongDefectiveReturnDiscount(discount), 1);
  }
  for (const discount of [0, 2, 30]) {
    assert.equal(getCharmWrongDefectiveReturnDiscount(discount), discount);
  }
  assert.equal(getWrongDefectiveReturnDiscount(undefined), 2);
});

test("preserves editable return discounts independently of selling prices", () => {
  for (const discount of [0, 5, 30]) {
    for (const basePrice of [0, 121, 999]) {
      for (const variantNumber of [1, 2, 5, 6]) {
        getVariantPrice(basePrice, variantNumber);
        assert.equal(getWrongDefectiveReturnDiscount(discount), discount);
        assert.equal(getWrongDefectiveReturnDiscount(String(discount)), discount);
      }
    }
  }
});
