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
  vm.runInNewContext(source, { module, exports: module.exports, URL, URLSearchParams, Intl,
    require: (name) => load(path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(filename), `${name}.ts`))),
  });
  cache.set(filename, module.exports);
  return module.exports;
}
const helpers = load("lib/general-product-catalog.ts");
const defaults = load("lib/general-product-defaults.ts");
const fixture = {
  databaseId: "saved-1", draft: { ...defaults.GENERAL_PRODUCT_SHARED_DEFAULTS, ...defaults.generalProductPackDefaults(),
    id: "parent-1", productName: "Universal Transparent Phone Charms Holder (Pack of 10)" },
  codes: defaults.GENERAL_PRODUCT_DEFAULT_CODES, parentVersion: 1, variants: [
    { id: "variant-1", version: 2, productName: "Transparent Mobile Phone Charms Holder (Pack of 10)", overrides: { price: "80", inventory: "8" } },
    { id: "variant-2", version: 3, productName: "Other listing (Pack of 10)", overrides: { category: "Craft Accessories", price: "90" } },
  ],
};
assert.equal(helpers.categoryHref("Beads & Charms"), "/general-products/category/Beads%20%26%20Charms");
assert.equal(helpers.generalProductAddVariantsHref("saved-1"), "/create-general-product?productId=saved-1&step=variants");
assert.equal(helpers.generalProductAddVariantsHref("saved/id"), "/create-general-product?productId=saved%2Fid&step=variants");
assert.equal(helpers.generalProductCategoryFromPath("Beads%20%26%20Charms"), "Beads & Charms");
assert.equal(helpers.generalProductCategoryFromPath("100%25%20Pure%20%2F%20Craft"), "100% Pure / Craft");
assert.equal(helpers.generalProductCategoryFromPath(" Category%ZZ "), "Category%ZZ");
assert.equal(helpers.listingMoney(64), "₹64");
assert.equal(helpers.listingMoney(64.5), "₹64.5");
const rows = helpers.categoryListingRows([fixture], "Beads & Charms");
assert.equal(rows.length, 2);
assert.equal(rows[1].price, "80");
assert.equal(rows[1].inventory, "8");
assert.equal(rows[1].sku, "MBRO-CHM-HLDR-GLD-10PC-V2");
assert.equal(rows[0].groupId, "1");
assert.equal(rows[1].groupId, "2");
assert.equal(helpers.categoryListingRows([fixture], "Craft Accessories")[0].id, "variant-2");
assert.equal(helpers.categoryListingRows([fixture], "Unknown").length, 0);
const families = helpers.generalProductCatalogFamilies([fixture], "Beads & Charms");
assert.equal(families.length, 1);
assert.equal(families[0].parentInCategory, true);
assert.equal(families[0].variants.length, 1, "Only this category’s variants appear beneath the parent");
assert.equal(families[0].variants[0].version, 2);
assert.equal(families[0].variants[0].row.price, "80");
const summary = helpers.summarizeGeneralProductCatalog(families);
assert.equal(summary.parents, 1);
assert.equal(summary.variants, 1);
assert.equal(summary.records, 2);
assert.equal(summary.inventory, 2008);
assert.equal(summary.value, 128640);
assert.equal(summary.lowStock, 1);
assert.equal(summary.outOfStock, 0);
const otherFamilies = helpers.generalProductCatalogFamilies([fixture], "Craft Accessories");
assert.equal(otherFamilies[0].parentInCategory, false, "Keep the related parent visible without counting/exporting it in the wrong category");
assert.equal(otherFamilies[0].rows.length, 1);
assert.equal(helpers.summarizeGeneralProductCatalog(otherFamilies).parents, 0);
assert.equal(helpers.summarizeGeneralProductCatalog(otherFamilies).variants, 1);
const categorySummaries = helpers.generalProductCategorySummaries([fixture]);
assert.equal(categorySummaries.length, 2);
assert.equal(categorySummaries.reduce((sum, item) => sum + item.records, 0), 3);
assert.equal(categorySummaries[0].families, 1);
assert.equal(helpers.generalProductStockStatus(0), "out-of-stock");
assert.equal(helpers.generalProductStockStatus(1), "low-stock");
assert.equal(helpers.generalProductStockStatus(10), "low-stock");
assert.equal(helpers.generalProductStockStatus(11), "in-stock");
const filters = { query: "", productType: "", stock: "", sort: "newest" };
assert.equal(helpers.filterGeneralProductCatalog(families, { ...filters, query: "-V2" }).length, 1, "Variant searches retain the family grouping");
assert.equal(helpers.filterGeneralProductCatalog(families, { ...filters, stock: "low-stock" }).length, 1);
assert.equal(helpers.filterGeneralProductCatalog(families, { ...filters, query: "-V1", stock: "low-stock" }).length, 0, "Filters must match the same effective listing");
assert.equal(helpers.filterGeneralProductCatalog(families, { ...filters, productType: "Other type" }).length, 0);
const secondFixture = { ...fixture, databaseId: "saved-2", parentVersion: 4,
  draft: { ...fixture.draft, id: "parent-2", price: "100", inventory: "5" }, variants: [], createdAt: "2026-10-08T12:00:00Z" };
const firstFixture = { ...fixture, createdAt: "2026-10-07T12:00:00Z" };
const sortable = helpers.generalProductCatalogFamilies([firstFixture, secondFixture], "Beads & Charms");
assert.equal(helpers.filterGeneralProductCatalog(sortable, filters)[0].product.databaseId, "saved-2");
assert.equal(helpers.filterGeneralProductCatalog(sortable, { ...filters, sort: "price-low" })[0].product.databaseId, "saved-1");
assert.equal(helpers.filterGeneralProductCatalog(sortable, { ...filters, sort: "price-high" })[0].product.databaseId, "saved-2");
assert.equal(helpers.filterGeneralProductCatalog(sortable, { ...filters, sort: "stock-high" })[0].product.databaseId, "saved-1");
assert.equal(helpers.generalProductDetailsHref(fixture, rows[1], "Beads & Charms"), "/general-products/saved-1?category=Beads+%26+Charms&listing=variant-1");
const fields = helpers.GENERAL_PRODUCT_DETAIL_SECTIONS.flatMap((section) => section.fields.map(([field]) => field));
const typeSource = fs.readFileSync(path.resolve(__dirname, "../lib/general-product-excel.ts"), "utf8").split("export type GeneralProductListing = {")[1].split("};")[0];
const allFields = [...typeSource.matchAll(/\s+(\w+): string;/g)].map((match) => match[1]).filter((field) => field !== "id");
assert.deepEqual([...fields].sort(), allFields.sort(), "Every exported field must appear in product details exactly once");

(async () => {
  const products = Array.from({ length: 205 }, (_, index) => ({ ...fixture, databaseId: `saved-${index}` }));
  const requests = [];
  const progress = [];
  const result = await helpers.loadCategoryProducts("Beads & Charms", async (url) => {
    const params = new URLSearchParams(url.slice(1));
    assert.equal(params.get("category"), "Beads & Charms");
    assert.equal(params.get("limit"), "100");
    assert.equal(params.has("q"), false, "Table search must not truncate a category export");
    const page = Number(params.get("page")); requests.push(page);
    return { products: products.slice((page - 1) * 100, page * 100), pagination: { page, limit: 100, total: 205, pages: 3 } };
  }, (loaded, total) => progress.push([loaded, total]));
  assert.equal(result.length, 205);
  assert.deepEqual(requests, [1, 2, 3]);
  assert.deepEqual(progress, [[100, 205], [200, 205], [205, 205]]);
  assert.equal((await helpers.loadCategoryProducts("Empty", async () => ({ products: [], pagination: { page: 1, total: 0, pages: 0 } }))).length, 0);
  await assert.rejects(helpers.loadCategoryProducts("Changed", async (url) => {
    const page = Number(new URLSearchParams(url.slice(1)).get("page"));
    return { products: [fixture], pagination: { page, total: page === 1 ? 2 : 3, pages: 2 } };
  }), /changed during export/);
  await assert.rejects(helpers.loadCategoryProducts("Duplicate", async (url) => ({ products: [fixture],
    pagination: { page: Number(new URLSearchParams(url.slice(1)).get("page")), total: 2, pages: 2 } })), /changed during export/);
  await assert.rejects(helpers.loadCategoryProducts("Incomplete", async () => ({ products: [], pagination: { page: 1, total: 2, pages: 2 } })), /complete category/);
  console.log("PASS: category navigation, all saved detail fields, effective overrides, category isolation, full paginated exports and concurrent-change protection");
})().catch((error) => { console.error(error); process.exitCode = 1; });
