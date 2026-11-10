import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");
const ts = require("typescript");
const sourcePath = new URL("./charm-import.ts", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const compiledModule = { exports: {} };
vm.runInNewContext(compiled, {
  module: compiledModule,
  exports: compiledModule.exports,
});
const {
  parseCharmWorkbookRows,
  readCharmWorkbookCellText,
} = compiledModule.exports;

const headers = [
  "Product Name",
  "Meesho Price",
  "Wrong/Defective Returns Price",
  "Compatible Models",
  "Image 1 (Front)",
  "Product ID / Style ID",
  "SKU ID",
  "Group ID",
];

function row(design, version, extra = {}) {
  const values = {
    productName: `Charm ${design} V${version}`,
    price: "191",
    discount: "2",
    model: "Apple iPhone 16",
    image1: "https://example.com/charm.jpg",
    styleId: `STYLE-${design}-${version}`,
    sku: `MC-AP-IP16-UVV-BLSNT-WL-TRNSPT-WITH CHARMS-${design}.1.V${version}`,
    groupId: String(version),
    ...extra,
  };
  return [
    values.productName,
    values.price,
    values.discount,
    values.model,
    values.image1,
    values.styleId,
    values.sku,
    values.groupId,
  ];
}

function sheet(rows, name = "Mobile-Cases---Covers-Fill this") {
  return [{ name, rows: [headers, ...rows] }];
}

test("reads empty merged workbook cells as blank text", () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Instructions");
  worksheet.mergeCells("A1:O1");

  assert.equal(readCharmWorkbookCellText(worksheet.getCell("B1")), "");

  worksheet.getCell("A2").value = "Product Name";
  assert.equal(
    readCharmWorkbookCellText(worksheet.getCell("A2")),
    "Product Name",
  );
});

test("reads multiple designs and orders each design by variant", () => {
  const items = parseCharmWorkbookRows(sheet([
    row("178", 10),
    row("176", 2),
    row("178", 2),
    row("176", 1),
    row("178", 1),
  ]));

  assert.deepEqual(
    Array.from(items, (item) => `${item.designNumber}:V${item.version}`),
    ["176:V1", "176:V2", "178:V1", "178:V2", "178:V10"],
  );
  assert.equal(items[0].data.price, 191);
  assert.equal(items[0].data.wrongDefectiveReturnsPrice, 2);
  assert.equal(JSON.stringify(items[0].data.models), JSON.stringify([{ model: "Apple iPhone 16" }]));
});

test("uses the parent portion of a decimal design path", () => {
  const [item] = parseCharmWorkbookRows(sheet([
    row("317.1", 3, {
      sku: "SDBR-MC-AP-IP16-UVV-APF-WL-TRNSPT-WITH CHARMS-317.1.1.V3",
    }),
  ]));
  assert.equal(item.designNumber, "317.1");
  assert.equal(item.version, 3);
});

test("supports long description headers and sparse rows", () => {
  const customHeaders = headers.map((header) =>
    header === "Product Name" ? "Product Name * This is the listing title" : header,
  );
  const items = parseCharmWorkbookRows([{
    name: "Sheet 1",
    rows: [
      customHeaders,
      ["Tutorial Link"],
      undefined,
      row("178", 1),
    ],
  }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].rowNumber, 4);
});

test("prefers Meesho fill-this sheets over template helper sheets", () => {
  const items = parseCharmWorkbookRows([
    {
      name: "Example Sheet",
      rows: [headers, row("178", 1, { sku: "EXAMPLE-SKU" })],
    },
    ...sheet([row("317", 1)]),
    {
      name: "Validation Sheet",
      rows: [headers, row("178", 1, { sku: "SKU INSTRUCTIONS" })],
    },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].designNumber, "317");
});

test("defaults blank charm return discount to 1", () => {
  const [item] = parseCharmWorkbookRows(sheet([
    row("178", 1, { discount: "" }),
  ]));
  assert.equal(item.data.wrongDefectiveReturnsPrice, 1);
});

test("allows the same version in different designs and rejects it inside one design", () => {
  const valid = parseCharmWorkbookRows(sheet([row("176", 1), row("178", 1)]));
  assert.equal(valid.length, 2);

  assert.throws(
    () => parseCharmWorkbookRows(sheet([row("178", 1), row("178", 1)])),
    /Design 178 contains 2 rows for V1/,
  );
});

test("rejects more than one charm SKU family for a design", () => {
  assert.throws(
    () => parseCharmWorkbookRows(sheet([
      row("178", 1),
      row("178", 2, {
        sku: "MC-AP-IP16-UVV-OTHER-WL-TRNSPT-WITH CHARMS-178.1.V2",
      }),
    ])),
    /Design 178 contains more than one charm SKU family/,
  );
});

test("reports malformed sheets, numbers, and SKUs", () => {
  assert.throws(
    () => parseCharmWorkbookRows([{ name: "Unknown", rows: [["hello"]] }]),
    /No supported Meesho product table/,
  );
  assert.throws(
    () => parseCharmWorkbookRows(sheet([row("178", 1, { price: "not-a-number" })])),
    /meesho price must be a number/i,
  );
  assert.throws(
    () => parseCharmWorkbookRows(sheet([row("178", 1, { sku: "INVALID" })])),
    /must end with a design number and version/,
  );
});
