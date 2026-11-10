/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS verification harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(filename) {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "..", filename), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const cjsModule = { exports: {} };
  vm.runInNewContext(source, { module: cjsModule, exports: cjsModule.exports, URL });
  return cjsModule.exports;
}

const { GENERAL_PRODUCT_TEMPLATE_COLUMNS: template } = load("lib/general-product-columns.ts");
const review = load("lib/general-product-review.ts");
const fields = (columns) => Array.from(columns, (column) => column.field);
assert.equal(template.length, 34);
assert.deepEqual(fields(review.generalProductReviewColumns(template, "all")), fields(template), "All fields keep workbook order");
assert.deepEqual(fields(review.generalProductReviewColumns(template, "quick")), ["productName", "price", "inventory", "quantity", "sku", "groupId"]);
assert.deepEqual(fields(review.generalProductReviewColumns(template, "images")), ["productName", "image1", "image2", "image3", "image4"]);
assert.deepEqual(fields(review.generalProductReviewColumns(template, "pricing")), ["productName", "price", "wrongDefectiveReturnsPrice", "mrp", "gst", "hsn", "weight", "inventory"]);
assert.ok(fields(review.generalProductReviewColumns(template, "supplier")).includes("manufacturerPincode"));
assert.ok(fields(review.generalProductReviewColumns(template, "details")).includes("styleId"));
const sections = review.generalProductReviewSections(template);
assert.equal(sections.length, 4);
const editorFields = sections.flatMap((section) => fields(section.columns));
assert.equal(editorFields.length, 34);
assert.equal(new Set(editorFields).size, 34, "Guided editor includes each workbook field once");
assert.deepEqual([...editorFields].sort(), fields(template).sort());
const custom = [{ field: "inventory", label: "Stock", numeric: true }, { field: "image4", label: "Extra image" }, { field: "length", label: "Length" }];
assert.deepEqual(fields(review.generalProductReviewColumns(custom, "all")), ["inventory", "image4"]);
assert.deepEqual(fields(review.generalProductReviewColumns(custom, "images")), ["image4"], "Views never add fields absent from a selected template");
for (const view of review.GENERAL_PRODUCT_REVIEW_VIEWS) {
  const filtered = review.generalProductReviewColumns([...template, { field: "length" }, { field: "width" }], view.id);
  assert.ok(!fields(filtered).includes("length") && !fields(filtered).includes("width"));
}
assert.equal(review.generalProductImageSource("  https://example.com/product.png  "), "https://example.com/product.png");
assert.equal(review.generalProductImageSource("http://example.com/product.png"), "http://example.com/product.png", "HTTP can preview, but export still requires HTTPS");
for (const url of ["", "not-a-url", "/local.png", "javascript:alert(1)", "data:image/svg+xml,test", "file:///secret.png", "blob:http://localhost/test", "https://user:password@example.com/image.png"]) {
  assert.equal(review.generalProductImageSource(url), "", `Reject unsafe or malformed preview: ${url}`);
}
assert.equal(review.isGeneralProductImageField("image1"), true);
assert.equal(review.isGeneralProductImageField("sku"), false);
console.log("General-product review verified: focused views, full template coverage, hidden dimensions, and safe image preview URLs.");
