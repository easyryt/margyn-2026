/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS verification harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const ExcelJS = require("exceljs");

async function verify() {
  const projectRoot = path.resolve(__dirname, "..");
  const templatePath = path.join(projectRoot, "public", "meesho-template.xlsx");
  const template = fs.readFileSync(templatePath);
  let responseBuffer = template;
  let responseOk = true;
  let downloadedBlob;
  let downloadedName;
  function compile(filename) {
    return ts.transpileModule(fs.readFileSync(path.join(projectRoot, filename), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
  }
  const columnsModule = { exports: {} };
  vm.runInNewContext(compile("lib/general-product-columns.ts"), { module: columnsModule, exports: columnsModule.exports });
  const exporter = { exports: {} };
  vm.runInNewContext(compile("lib/general-product-excel.ts"), {
    exports: exporter.exports, module: exporter, Blob,
    fetch: async (url) => {
      assert.equal(url, "/listing-tool/meesho-template.xlsx", "Always use the same bundled workbook as phone listings");
      return { ok: responseOk, arrayBuffer: async () => responseBuffer };
    },
    require: (name) => name === "file-saver"
      ? { saveAs: (blob, name) => { downloadedBlob = blob; downloadedName = name; } }
      : name === "./general-product-columns" ? columnsModule.exports : require(name),
  });

  const input = new ExcelJS.Workbook();
  await input.xlsx.load(template);
  const originalListing = input.getWorksheet("Mobile-Cases---Covers-Fill this");
  assert.ok(originalListing);
  const previewColumns = await exporter.exports.readGeneralProductTemplateColumns();
  const plain = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(previewColumns), plain(columnsModule.exports.GENERAL_PRODUCT_TEMPLATE_COLUMNS), "Review fields match the shared workbook's headers and order");
  assert.equal(previewColumns.length, 34);
  assert.ok(previewColumns.every(({ field }) => !["length", "width", "includedComponents"].includes(field)));
  assert.equal(columnsModule.exports.generalProductColumnForHeader("\n\nERROR STATUS\n\nFor system use"), undefined);
  assert.equal(columnsModule.exports.generalProductColumnForHeader("Product Width(cm)").field, "width");
  assert.equal(columnsModule.exports.generalProductColumnForHeader("Type").field, "productType");
  assert.equal(columnsModule.exports.generalProductColumnForHeader("Brand").field, "brand");

  // Independent, explicit positions from the actual shared template.
  const mapping = {
    productName: "D", variation: "E", price: "F", wrongDefectiveReturnsPrice: "G", mrp: "H", gst: "I",
    hsn: "J", weight: "K", inventory: "L", country: "M", manufacturer: "N", manufacturerAddress: "O",
    manufacturerPincode: "P", packer: "Q", packerAddress: "R", packerPincode: "S", importer: "T",
    importerAddress: "U", importerPincode: "V", color: "W", genericName: "Y", material: "Z", quantity: "AA",
    length: "AB", width: "AC", theme: "AD", productType: "AE", image1: "AF", image2: "AG", image3: "AH",
    image4: "AI", styleId: "AJ", sku: "AK", brand: "AL", groupId: "AM", description: "AN",
  };
  const numericFields = new Set(["price", "wrongDefectiveReturnsPrice", "mrp", "gst", "weight", "inventory", "quantity"]);
  const product = Object.fromEntries(Object.keys(mapping).map((field) => [field, ""]));
  Object.assign(product, {
    id: "verification-parent", category: "Beads & Charms",
    productName: "Universal Transparent Mobile Case Lanyard Insert Tabs Phone Charms Holder (Pack of 10)",
    variation: "Free Size", genericName: "Beads & Charms", includedComponents: "10 Phone Charms Holders",
    price: "64", wrongDefectiveReturnsPrice: "63", mrp: "399", gst: "18", hsn: "003296", weight: "10.5",
    inventory: "0", country: "India", manufacturer: "Example Manufacturer", manufacturerAddress: "Delhi",
    manufacturerPincode: "001234", packer: "Example Packer", packerAddress: "Delhi", packerPincode: "001235",
    importer: "Not Applicable", importerAddress: "Not Applicable", importerPincode: "001236", color: "Transparent",
    material: "Plastic", quantity: "10", theme: "Solid", productType: "Phone Charms Holder",
    image1: "https://example.com/front.png", image2: "https://example.com/second.png",
    image3: "https://example.com/third.png", image4: "https://example.com/fourth.png",
    styleId: "MBRO-CHM-HLDR-GLD-10PC-V1", sku: "MBRO-CHM-HLDR-GLD-10PC-V1", brand: "Example",
    groupId: "1", description: "Transparent tabs for attaching phone charms.",
  });
  async function exportRows(rows, name) {
    downloadedBlob = undefined;
    await exporter.exports.exportGeneralProductExcel(rows, name);
    assert.ok(downloadedBlob);
    assert.equal(downloadedBlob.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await downloadedBlob.arrayBuffer()));
    return workbook;
  }
  function assertRows(workbook, rows) {
    const listing = workbook.getWorksheet(originalListing.name);
    for (const [index, row] of rows.entries()) {
      for (const [field, column] of Object.entries(mapping)) {
        const expected = numericFields.has(field) && row[field].trim() ? Number(row[field]) : row[field] || null;
        assert.equal(listing.getCell(column + (index + 6)).value, expected, field + " at " + column + (index + 6));
      }
      assert.equal(listing.getCell("AO" + (index + 6)).value, row.brand, "Fill both Brand Name and Brand");
      assert.equal(listing.getCell("X" + (index + 6)).value, null, "Never invent a phone model for a general product");
    }
    assert.equal(listing.getCell("D" + (rows.length + 6)).value, null, "Do not include unselected or stale rows");
  }
  function assertTemplatePreserved(workbook) {
    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), input.worksheets.map((sheet) => sheet.name));
    const listing = workbook.getWorksheet(originalListing.name);
    for (let row = 1; row <= 5; row += 1) {
      for (let column = 1; column <= 41; column += 1) {
        const actual = listing.getCell(row, column);
        const original = originalListing.getCell(row, column);
        if (original.formulaType) {
          assert.equal(actual.formula, original.formula, "Preserve translated formulas when materializing shared formulas");
          assert.equal(actual.value.result, original.value.result);
        } else assert.deepEqual(actual.value, original.value, "Preserve header/tutorial/spacer rows");
        assert.deepEqual(listing.getCell(row, column).style, originalListing.getCell(row, column).style);
      }
    }
    assert.deepEqual(listing.model.merges, originalListing.model.merges);
    assert.deepEqual(listing.views, originalListing.views);
    assert.deepEqual(listing.dataValidations.model, originalListing.dataValidations.model, "Keep original dropdowns");
    for (let column = 1; column <= 41; column += 1) assert.equal(listing.getColumn(column).width, originalListing.getColumn(column).width);
  }

  const output = await exportRows([product], "saved-selection.xlsx");
  assert.equal(downloadedName, "saved-selection.xlsx");
  assertRows(output, [product]);
  assertTemplatePreserved(output);

  const variants = Array.from({ length: 30 }, (_, index) => ({
    ...product, id: "verification-variant-" + (index + 2), groupId: String(index + 2),
    productName: "Universal Transparent Lanyard Insert Tabs Phone Charms Holder Variant " + (index + 2) + " (Pack of 10)",
    styleId: "MBRO-CHM-HLDR-GLD-10PC-V" + (index + 2), sku: "MBRO-CHM-HLDR-GLD-10PC-V" + (index + 2),
  }));
  const batchRows = [product, ...variants, {
    ...product, id: "second-parent", category: "Hair Accessories", quantity: "15", price: "84", wrongDefectiveReturnsPrice: "83",
    productName: "Green Decorative Hair Clips (Pack of 15)", genericName: "Hair Accessories", productType: "Hair Clips",
    styleId: "SELLER-PARENT_001", sku: "SELLER-PARENT_001", groupId: "32",
  }];
  const batch = await exportRows(batchRows);
  assertRows(batch, batchRows);
  assertTemplatePreserved(batch);
  assertRows(await exportRows([variants[4], variants[9]]), [variants[4], variants[9]]);
  assertRows(await exportRows([batchRows[31]]), [batchRows[31]]);

  // Exercise stale samples and shared system formulas in memory, never edit the source workbook.
  const fixture = new ExcelJS.Workbook();
  await fixture.xlsx.load(template);
  const fixtureSheet = fixture.getWorksheet(originalListing.name);
  fixtureSheet.getCell("D6").value = "Old sample";
  fixtureSheet.getCell("D7").value = "Unused sample";
  fixtureSheet.getCell("AK7").value = "OLD-SAMPLE";
  fixtureSheet.getCell("B6").value = { formula: 'IF(D6="","",LEN(D6))', shareType: "shared", ref: "B6:B9", result: 10 };
  for (let row = 7; row <= 9; row += 1) fixtureSheet.getCell("B" + row).value = { sharedFormula: "B6", result: 10 };
  responseBuffer = await fixture.xlsx.writeBuffer();
  const cleaned = await exportRows([product]);
  assertRows(cleaned, [product]);
  assert.equal(cleaned.getWorksheet(originalListing.name).getCell("AK7").value, null);
  assert.equal(cleaned.getWorksheet(originalListing.name).getCell("B9").formula, 'IF(D9="","",LEN(D9))');
  responseBuffer = template;
  responseOk = false;
  await assert.rejects(exporter.exports.exportGeneralProductExcel([product]), /Unable to load meesho-template.xlsx/);
  await assert.rejects(exporter.exports.exportGeneralProductExcel([]), /at least one product/);
  assert.deepEqual(fs.readFileSync(templatePath), template, "Never alter the original shared template");
  for (const filename of ["components/GeneralProductBuilder.tsx", "components/GeneralProductExportDialog.tsx"]) {
    const source = fs.readFileSync(path.join(projectRoot, filename), "utf8");
    assert.doesNotMatch(source, /accept=[^\n]*\.xlsx|chooseTemplate|templateFile|setTemplate/, "General-product UI has no template chooser");
  }
  console.log("General-product export verified: shared meesho-template.xlsx, row 6, 34 review fields, exact columns, 30 variants, custom SKUs, selected-only rows, other categories without uploads, numeric values, headers, dropdowns, sample cleanup and shared formulas.");
}
verify().catch((error) => { console.error(error); process.exitCode = 1; });
