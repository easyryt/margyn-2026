const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cache = new Map();

function load(relativePath) {
  const filename = path.resolve(__dirname, "..", relativePath);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, URL,
    require: (name) => load(path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(filename), `${name}.ts`))),
  });
  cache.set(filename, module.exports);
  return module.exports;
}

const defaults = load("lib/general-product-defaults.ts");
const helpers = load("lib/general-product-batch.ts");
const codes = defaults.GENERAL_PRODUCT_DEFAULT_CODES;
const title = "Universal Transparent Mobile Case Lanyard Insert Tabs Phone Charms Holder (Pack of 10)";
const draft = {
  ...defaults.GENERAL_PRODUCT_SHARED_DEFAULTS, ...defaults.generalProductPackDefaults(),
  id: "parent-1", productName: title, groupId: "Group 01", color: "Transparent",
  material: "Not specified", theme: "Not specified", length: "", width: "",
};

assert.equal(defaults.GENERAL_PRODUCT_SHARED_DEFAULTS.productName, "");
assert.equal(defaults.GENERAL_PRODUCT_SHARED_DEFAULTS.hsn, "392640");
assert.equal(defaults.GENERAL_PRODUCT_SHARED_DEFAULTS.manufacturerPincode, "Mobiro", "Preserve source without inventing an address/pincode");
assert.equal(draft.price, "64");
assert.equal(draft.wrongDefectiveReturnsPrice, "63");
assert.equal(draft.mrp, "399");
assert.equal(draft.weight, "10");
assert.equal(draft.inventory, "2000");
for (const [quantity, price, returnsPrice] of [["10", "64", "63"], ["15", "84", "83"], ["20", "100", "83"], ["25", "114", "113"], ["30", "134", "133"]]) {
  const preset = defaults.generalProductPackDefaults(quantity);
  assert.equal(preset.price, price); assert.equal(preset.wrongDefectiveReturnsPrice, returnsPrice);
  assert.equal(preset.quantity, quantity);
  assert.ok(preset.image1.endsWith(`-${quantity}PC-V1.png`));
  assert.equal(preset.includedComponents, `${quantity} Pcs of Charms Holder`);
}

const parent = { draft, codes, variants: [], parentVersion: 1, productContext: "" };
assert.equal(helpers.generalProductBatchError(helpers.generalProductBatchRows(parent)), "");
assert.equal(helpers.generalProductBatchRows(parent)[0].sku, "MBRO-CHM-HLDR-GLD-10PC-V1");
assert.equal(helpers.nextGeneralProductVersion([], codes, "10"), 1);

const withVariants = { ...parent, variants: Array.from({ length: 30 }, (_, index) => ({
  id: `variant-${index}`, productName: `Transparent Mobile Case Phone Charms Holder Tabs Version ${index + 2} (Pack of 10)`, version: index + 2,
})) };
const firstRows = helpers.generalProductBatchRows(withVariants);
assert.equal(firstRows.length, 31);
assert.equal(helpers.nextGeneralProductVersion([withVariants], codes, "10"), 32);
assert.equal(helpers.nextGeneralProductVersion([withVariants], codes, "15"), 1);
assert.equal(helpers.nextGeneralProductGroup([]), "1");
assert.equal(helpers.nextGeneralProductGroup([withVariants]), "32", "Each legacy row gets a separate numeric group");
assert.equal(helpers.generalProductGroupId("Group 003"), "3");
assert.equal(helpers.generalProductGroupId(" 2 "), "2");
assert.equal(helpers.generalProductGroupId("Holiday catalog"), "Holiday catalog", "Preserve existing custom group names");
const second = { ...parent, draft: { ...draft, id: "parent-2", groupId: "Group 32" }, parentVersion: 32 };
const third = { ...parent, draft: { ...draft, ...defaults.generalProductPackDefaults("15"),
  id: "parent-3", productName: title.replace("Pack of 10", "Pack of 15"), groupId: "Group 33" } };
const rows = [withVariants, second, third].flatMap(helpers.generalProductBatchRows);
assert.equal(rows.length, 33);
assert.equal(new Set(rows.map((row) => row.sku)).size, 33);
assert.ok(rows.every((row) => row.sku === row.styleId));
assert.equal(helpers.generalProductBatchError(rows), "");
assert.deepEqual(Array.from(rows, (row) => row.groupId), Array.from({ length: 33 }, (_, index) => String(index + 1)));
assert.equal(new Set(firstRows.map((row) => row.groupId)).size, 31, "Parent 1, variants 2 through 31");
assert.equal(helpers.nextGeneralProductGroup([withVariants, second, third]), "34");
assert.equal(helpers.nextGeneralProductGroup([withVariants, third]), "34", "Removing a product does not reuse another group's identifier");
assert.equal(helpers.nextGeneralProductGroup([{ ...parent, draft: { ...draft, groupId: "7" } }]), "8");
assert.equal(helpers.generalProductBatchRows({ ...withVariants, variants: [{ ...withVariants.variants[0], overrides: { groupId: "99" } }] })[1].groupId, "2", "A stale override cannot change a variant's automatic group");
assert.match(helpers.generalProductBatchError([...rows, rows[0]]), /Duplicate SKU/);

const override = { ...withVariants, variants: [{ ...withVariants.variants[0], overrides: { price: "70", inventory: "123", image2: "https://example.com/variant.png" } }] };
const overriddenRows = helpers.generalProductBatchRows(override);
assert.equal(overriddenRows[0].price, "64");
assert.equal(overriddenRows[1].price, "70");
assert.equal(overriddenRows[1].inventory, "123");
assert.equal(overriddenRows[1].image2, "https://example.com/variant.png");
assert.match(helpers.generalProductBatchError([{ ...rows[0], quantity: "15" }]), /Title must include/);
assert.match(helpers.generalProductBatchError([{ ...rows[0], image1: "" }]), /hosted HTTPS/);
assert.match(helpers.generalProductBatchError([{ ...rows[0], price: "400" }]), /exceed MRP/);
assert.match(helpers.generalProductBatchError([{ ...rows[0], wrongDefectiveReturnsPrice: "65" }]), /exceed Meesho/);
assert.equal(helpers.generalProductBatchError([{ ...rows[0], inventory: "0" }]), "");
assert.equal(helpers.generalProductExportCategoryError(rows), "");
assert.equal(helpers.generalProductExportCategoryError([{ ...rows[0], category: "Hair Accessories" }]), "", "Every category uses the shared template without an upload");
assert.match(helpers.generalProductExportCategoryError([rows[0], { ...rows[1], category: "Hair Accessories" }]), /one category/);
let nextId = 0;
const createId = () => `added-${++nextId}`;
const stored = { ...override, databaseId: "saved-parent", databaseRevision: 7 };
const added = helpers.appendGeneralProductVariants({ item: stored, titles: [
  "Universal Phone Charms Holder Tabs for Mobile Cases (Pack of 10)",
  "Clear Phone Charms Holder Inserts for Lanyards (Pack of 10)",
], batch: [stored], createId });
assert.equal(added.databaseId, "saved-parent");
assert.equal(added.databaseRevision, 7);
assert.equal(stored.variants.length, 1, "Appending does not mutate the saved snapshot");
assert.equal(added.variants[0].id, stored.variants[0].id);
assert.equal(added.variants[0].overrides.image2, "https://example.com/variant.png");
assert.equal(added.variants[0].overrides.price, "70");
assert.deepEqual(Array.from(helpers.generalProductBatchRows(added), (row) => row.groupId), ["1", "2", "3", "4"]);
assert.deepEqual(Array.from(added.variants, (variant) => variant.version), [2, 3, 4]);
const occupied = { ...parent, draft: { ...draft, id: "another-saved-product" }, parentVersion: 100 };
const afterRemoval = { ...added, variants: added.variants.slice(1) };
const more = helpers.appendGeneralProductVariants({ item: afterRemoval, titles: [
  "Phone Charms Holder Clear Tabs for Universal Lanyards (Pack of 10)",
], batch: [afterRemoval], occupiedProducts: [occupied], createId });
assert.deepEqual(Array.from(helpers.generalProductBatchRows(more), (row) => row.groupId), ["1", "3", "4", "5"]);
assert.equal(more.variants.at(-1).version, 101, "Skip versions occupied by another saved family");
assert.throws(() => helpers.appendGeneralProductVariants({ item: added, titles: [added.variants[1].productName], batch: [added], createId }), /unique title/);
assert.throws(() => helpers.appendGeneralProductVariants({ item: { ...added, variants: Array(500).fill(added.variants[0]) }, titles: ["Any title"], batch: [], createId }), /up to 500/);
assert.throws(() => helpers.appendGeneralProductVariants({ item: parent, titles: [], batch: [], createId }), /between 1 and 50/);
console.log("General product batch verified: sequential per-listing groups, saved-product variant appends, preserved overrides, unique SKUs, limits, and export validation.");

const customParent = helpers.withGeneralProductSku(withVariants, draft.id, "MY-NECKLACE_001.D");
const custom = helpers.withGeneralProductSku(customParent, withVariants.variants[0].id, "SPECIAL-NECKLACE_002");
const customRows = helpers.generalProductBatchRows(custom);
assert.equal(customRows[0].sku, "MY-NECKLACE_001");
assert.equal(customRows[0].styleId, customRows[0].sku);
assert.equal(customRows[1].sku, "SPECIAL-NECKLACE_002");
assert.equal(customRows[1].styleId, customRows[1].sku);
assert.equal(firstRows[0].sku, "MBRO-CHM-HLDR-GLD-10PC-V1", "Editing does not mutate the generated snapshot");
assert.equal(helpers.nextGeneralProductVersion([custom], codes, "10"), 32, "Manual IDs do not reset version allocation");
const allCustom = { ...custom, variants: custom.variants.map((variant) => ({ ...variant, skuOverride: `CUSTOM-${variant.version}` })) };
assert.equal(helpers.nextGeneralProductVersion([allCustom], codes, "10"), 32, "Reserve metadata versions even when every ID is custom");
const namedVersion = helpers.withGeneralProductSku(parent, draft.id, "MBRO-CHM-HLDR-GLD-10PC-V400.D");
assert.equal(helpers.nextGeneralProductVersion([namedVersion], codes, "10"), 401);
const resetSku = helpers.withGeneralProductSku(custom, draft.id, null);
assert.equal(helpers.generalProductBatchRows(resetSku)[0].sku, "MBRO-CHM-HLDR-GLD-10PC-V1");
assert.equal(helpers.generalProductBatchError(customRows), "");
assert.match(helpers.generalProductBatchError(helpers.generalProductBatchRows(helpers.withGeneralProductSku(custom, draft.id, "invalid sku"))), /Enter a SKU/);
const duplicateCustom = helpers.withGeneralProductSku(custom, draft.id, customRows[1].sku);
assert.match(helpers.generalProductBatchError(helpers.generalProductBatchRows(duplicateCustom)), /Duplicate SKU/);
assert.equal(helpers.generalProductBatchRows(helpers.withGeneralProductSku(parent, draft.id, ""))[0].sku, "", "An empty edit must not silently restore a generated SKU");
const customAdded = helpers.appendGeneralProductVariants({ item: { ...stored, skuOverride: "CUSTOM-PARENT", variants: [{ ...stored.variants[0], skuOverride: "CUSTOM-VARIANT" }] },
  titles: ["Gold Eyelet Phone Charms Holder Tabs for Mobile Cases (Pack of 10)"], batch: [stored], createId });
assert.equal(customAdded.skuOverride, "CUSTOM-PARENT");
assert.equal(customAdded.variants[0].skuOverride, "CUSTOM-VARIANT");
assert.equal(customAdded.variants[1].version, 3);
console.log("Editable SKUs verified: no .D suffix, parent/variant edits, matching Style IDs, reset, immutable updates, preserved custom IDs and safe version allocation.");
