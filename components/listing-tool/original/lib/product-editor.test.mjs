import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const modules = new Map();
function loadTs(name) {
  if (modules.has(name)) return modules.get(name);
  const compiledModule = { exports: {} };
  modules.set(name, compiledModule.exports);
  const source = fs.readFileSync(new URL(`./${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(compiled, {
    module: compiledModule, exports: compiledModule.exports,
    require: (path) => path.startsWith("./") && !path.endsWith(".json") ? loadTs(path.slice(2)) : require(path),
  });
  return compiledModule.exports;
}
const {
  productEditorVersion, productToEditorForm, hasProductEditorChanges,
  changeProductEditorField, buildProductEditorPayload,
  planProductEditorUpdates, mergeProductEditorSave,
} = loadTs("product-editor");

const parent = {
  id: "parent", productName: "Parent cover", description: "", brand: "Mobiro",
  category: "Mobile Cases & Covers", genericName: "Mobile Cases & Covers",
  designName: "Floral Case", designCode: "FLORAL", designNumber: "319", designId: "",
  sku: "MBRO-CASE-319.1.V1", styleId: "MBRO-CASE-319.1.V1", version: "1",
  price: 191, wrongDefectiveReturnsPrice: 1, mrp: 899, gst: 18,
  weight: 25, inventory: 2000, quantity: 1, length: 8, width: 1,
  models: [{ model: "Apple iPhone 11" }], image1: "original.jpg",
};
const variant = (version, extra = {}) => ({
  ...parent, id: `v${version}`, parentId: parent.id, variantNumber: version,
  variantType: "standard", version: String(version),
  productName: `Variant ${version}`, sku: `MBRO-CASE-319.1.V${version}`,
  styleId: `MBRO-CASE-319.1.V${version}`, price: 191 + (version - 1) % 5,
  ...extra,
});
const formsFor = (rows) => Object.fromEntries(rows.map((row) => [row.id, productToEditorForm(row)]));

test("round-trips row values, zeroes and models without relationship fields", () => {
  const row = { ...parent, price: 0, wrongDefectiveReturnsPrice: 0, inventory: 0 };
  const form = productToEditorForm(row);
  assert.equal(hasProductEditorChanges(row, form), false);
  form.models = "Apple iPhone 11\n\nApple iPhone 12\nApple iPhone 11";
  const payload = buildProductEditorPayload(row, form);
  assert.equal(payload.price, 0);
  assert.equal(payload.wrongDefectiveReturnsPrice, 0);
  assert.equal(payload.inventory, 0);
  assert.equal(JSON.stringify(payload.models), JSON.stringify([{ model: "Apple iPhone 11" }, { model: "Apple iPhone 12" }]));
  assert.equal(Object.hasOwn(payload, "parentId"), false);
  assert.equal(Object.hasOwn(payload, "variantNumber"), false);
});

test("a variant-only edit updates only that version", () => {
  const rows = [parent, variant(2), variant(10)];
  const forms = formsFor(rows);
  forms.v10.price = "250";
  const plans = planProductEditorUpdates(rows, forms, ["v10"]);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].product.id, "v10");
  assert.equal(plans[0].payload.price, 250);
  assert.equal(plans[0].payload.version, "10");
  for (const field of ["designName", "designCode", "designNumber", "designId"]) {
    assert.equal(Object.hasOwn(plans[0].payload, field), false);
  }
});

test("plans parent price changes first and preserves explicit variant prices", () => {
  const rows = [variant(6), variant(2), parent, variant(3, { variantType: "charm" })];
  const forms = formsFor(rows);
  forms.parent.price = "220";
  forms.v2.price = "299";
  const plans = planProductEditorUpdates(rows, forms, ["parent", "v2"]);
  assert.equal(plans.map((plan) => plan.product.id).join(","), "parent,v2,v6");
  assert.equal(plans[1].payload.price, 299);
  assert.equal(plans[2].payload.price, 220);
  assert.equal(plans[2].direct, false);
  assert.equal(Object.keys(plans[2].payload).join(","), "price");
  assert.equal(rows[0].price, 191);
});

test("brand updates keep identifiers in sync without overwriting row edits", () => {
  const rows = [parent, variant(2), variant(3)];
  const forms = formsFor(rows);
  forms.parent = changeProductEditorField(forms.parent, "brand", "Sadarbazar");
  forms.v2 = changeProductEditorField(forms.v2, "brand", "Fibio");
  const plans = planProductEditorUpdates(rows, forms, ["parent", "v2"]);
  assert.equal(plans[1].payload.brand, "Fibio");
  assert.equal(plans[1].payload.sku, "FBO-CASE-319.1.V2");
  assert.equal(plans[2].payload.brand, "Sadarbazar");
  assert.equal(plans[2].payload.sku, "SDBR-CASE-319.1.V3");
  assert.equal(plans[2].payload.styleId, "SDBR-CASE-319.1.V3");
});

test("shared parent fields are opt-in and explicit edited cells take priority", () => {
  const rows = [parent, variant(2)];
  const forms = formsFor(rows);
  forms.parent.description = "Parent edit";
  forms.parent.models = "Apple iPhone 12";
  assert.equal(planProductEditorUpdates(rows, forms, ["parent"]).length, 1);
  forms.v2.models = "Apple iPhone 13";
  const plans = planProductEditorUpdates(rows, forms, ["parent", "v2"], true);
  assert.equal(JSON.stringify(plans[1].payload.models), JSON.stringify([{ model: "Apple iPhone 13" }]));
  assert.equal(plans[1].payload.description, "");
  assert.equal(plans[1].payload.image1, "original.jpg");
});

test("validates every edited row before planning requests", () => {
  const rows = [parent, variant(2)];
  const forms = formsFor(rows);
  forms.parent.productName = "New title";
  forms.v2.price = "-1";
  assert.throws(() => planProductEditorUpdates(rows, forms, ["parent", "v2"]), /V2.*price/);
  forms.v2.price = "192";
  forms.v2.wrongDefectiveReturnsPrice = "31";
  assert.throws(() => planProductEditorUpdates(rows, forms, ["v2"]), /₹30/);
});

test("successful inherited saves preserve other unsaved cells, direct saves reset them", () => {
  const row = variant(2);
  const form = { ...productToEditorForm(row), productName: "Unsaved title" };
  const updated = { ...row, price: 222 };
  const merged = mergeProductEditorSave(row, form, updated, false);
  assert.equal(merged.productName, "Unsaved title");
  assert.equal(merged.price, "222");
  assert.equal(hasProductEditorChanges(updated, merged), true);
  assert.equal(hasProductEditorChanges(updated, mergeProductEditorSave(row, form, updated, true)), false);
});

test("failed inherited changes stay dirty and can be retried after the parent saves", () => {
  const row = variant(2);
  const form = productToEditorForm(row);
  const pending = mergeProductEditorSave(row, form, { ...row, price: 222 }, false);
  assert.equal(hasProductEditorChanges(row, pending), true);
  const plans = planProductEditorUpdates([row], { [row.id]: pending }, [row.id]);
  assert.equal(plans[0].payload.price, 222);
});

test("keeps version ordering numeric", () => {
  assert.equal(productEditorVersion(parent), 1);
  assert.equal(productEditorVersion(variant(10)), 10);
});

test("renders every version in an editable table instead of version and section tabs", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const source = fs.readFileSync(new URL("../components/ProductForm/ProductEditorModal.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  }).outputText;
  const componentModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: componentModule, exports: componentModule.exports,
    process: { env: {} },
    require: (path) => path.startsWith("@/components/listing-tool/original/lib/") ? loadTs(path.slice("@/components/listing-tool/original/lib/".length)) : path.startsWith("@/components/listing-tool/original/components/Meesho") ? (() => null) : require(path),
  });
  const markup = renderToStaticMarkup(React.createElement(componentModule.exports.default, {
    product: parent, family: [variant(10), parent, variant(2)],
    onClose() {}, onSaved() {},
  }));
  assert.match(markup, /<table/);
  assert.equal((markup.match(/<tr/g) ?? []).length, 4);
  assert.match(markup, /aria-label="Product Name for V10"/);
  assert.match(markup, /aria-label="Compatible Models for V2"/);
  assert.match(markup, /Save all changes/);
  assert.doesNotMatch(markup, /Basic &amp; models|Design &amp; SKU|role="tab"/);
  assert.ok(markup.indexOf("Product Name for V2") < markup.indexOf("Product Name for V10"));
});
