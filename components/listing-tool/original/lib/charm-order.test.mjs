import assert from "node:assert/strict";
import test from "node:test";
import { charmVariantNumber, groupCharmsByFamily, sortCharmsByVersion } from "./charm-order.ts";

const charm = (number, extra = {}) => ({
  id: `charm-${number}`,
  sku: `SDBR-MC-AP-IP16-WITH CHARMS-317.1.V${number}`,
  designNumber: "317.1",
  ...extra,
});
const versions = (rows) => rows.map(charmVariantNumber);

test("sorts versions numerically, including V10 and later", () => {
  const rows = [10, 3, 12, 1, 5, 2, 11, 9, 8, 6, 4, 7].map((n) => charm(n));
  assert.deepEqual(versions(sortCharmsByVersion(rows)), Array.from({ length: 12 }, (_, i) => i + 1));
});

test("recognizes source metadata, legacy numbers and version strings", () => {
  assert.equal(charmVariantNumber({ sourceKind: "parent", sku: "old.V9" }), 1);
  assert.equal(charmVariantNumber({ sourceKind: "variant", sourceVariantNumber: 3, sku: "old.V2" }), 3);
  assert.equal(charmVariantNumber({ sku: "old.v10", variantNumber: 1 }), 10);
  assert.equal(charmVariantNumber({ variantNumber: "4" }), 4);
  assert.equal(charmVariantNumber({ version: "V5" }), 5);
  assert.equal(charmVariantNumber({ version: " 6 " }), 6);
});

test("puts missing/invalid versions last and keeps ties stable", () => {
  const rows = [
    { id: "unknown", version: "custom" },
    { id: "first-v2", version: "2" },
    { id: "zero", version: "V0" },
    { id: "second-v2", version: "V2" },
    { id: "negative", variantNumber: -3 },
    { id: "parent", sourceKind: "parent" },
  ];
  assert.deepEqual(sortCharmsByVersion(rows).map((row) => row.id),
    ["parent", "first-v2", "second-v2", "unknown", "zero", "negative"]);
});

test("ordering does not mutate rows, identifiers, prices or the original array", () => {
  const rows = Object.freeze([Object.freeze(charm(3, { price: 123 })), Object.freeze(charm(1, { price: 121 }))]);
  const sorted = sortCharmsByVersion(rows);
  assert.equal(sorted[0], rows[1]);
  assert.equal(sorted[1], rows[0]);
  assert.deepEqual(versions(rows), [3, 1]);
  assert.deepEqual(sorted.map((row) => row.price), [121, 123]);
});

test("keeps designs together and orders later additions inside each family", () => {
  const rows = [
    charm(10, { batchKey: "first" }),
    charm(3, { designNumber: "500.1", batchKey: "second" }),
    charm(2, { batchKey: "third" }),
    charm(1, { designNumber: "500.1", batchKey: "fourth" }),
    charm(1, { batchKey: "fifth" }),
  ];
  const groups = groupCharmsByFamily(rows);
  assert.deepEqual(groups.map(([key]) => key), ["design:317.1", "design:500.1"]);
  assert.deepEqual(groups.map(([, items]) => versions(items)), [[1, 2, 10], [1, 3]]);
  assert.deepEqual(groups.flatMap(([, items]) => items).map((row) => row.batchKey),
    ["fifth", "third", "first", "fourth", "second"]);
});

test("groups legacy SKU families and keeps unidentifiable rows separate", () => {
  const groups = groupCharmsByFamily([
    charm(10, { designNumber: "" }), charm(1, { designNumber: "" }),
    { id: "orphan-a" }, { id: "orphan-b" },
  ]);
  assert.deepEqual(groups.map(([, items]) => items.length), [2, 1, 1]);
  assert.deepEqual(versions(groups[0][1]), [1, 10]);
});
