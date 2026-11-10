import type {
  CellFormulaValue,
  CellSharedFormulaValue,
  Worksheet,
} from "exceljs";
import { saveAs } from "file-saver";

import { COLUMN } from "./columnMap";
import { getWrongDefectiveReturnDiscount } from "./pricing";
import { generateSKU } from "./sku";
import { assertProductTitlesForExport } from "./product-title-validation";

import type { Product } from "../components/ProductForm/ProductCard";

type ExportExcelOptions = {
  fileName?: string;
  preserveProductSku?: boolean;
};

function materializeSharedFormulas(worksheet: Worksheet) {
  const formulas: Array<{
    address: string;
    formula: string;
    result?: CellFormulaValue["result"];
  }> = [];

  // Capture every translated formula before changing any shared-formula master.
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (!cell.formulaType) {
        return;
      }

      const value = cell.value as
        | CellFormulaValue
        | CellSharedFormulaValue;

      formulas.push({
        address: cell.address,
        formula: cell.formula,
        result: value.result,
      });
    });
  });

  for (const { address, formula, result } of formulas) {
    const value: CellFormulaValue = { formula };

    if (result !== undefined) {
      value.result = result;
    }

    worksheet.getCell(address).value = value;
  }
}

export async function exportExcel(
  products: Product[] = [],
  options: ExportExcelOptions = {},
) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("Please add at least one product to the batch.");
  }

  assertProductTitlesForExport(products);

  const ExcelJS = (await import("exceljs")).default;

  const response = await fetch("/listing-tool/meesho-template.xlsx");

  if (!response.ok) {
    throw new Error("Unable to load Meesho template.");
  }

  const templateBuffer = await response.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("No worksheet found in the Excel template.");
  }

  // Large exports can overwrite a shared-formula master while leaving one of
  // its unused clones behind. Standalone formulas keep every template row valid.
  materializeSharedFormulas(worksheet);

  let rowNumber = 6;

  for (const product of products) {
    if (!Array.isArray(product.models) || product.models.length === 0) {
      continue;
    }

    for (const model of product.models) {
      const row = worksheet.getRow(rowNumber);

      const generatedSku = generateSKU({
          brand: product.brand,
          category: product.category,
          model: model.model,
          color: product.color,
          printType: product.printType,
          finish: product.finish,
          designCode: product.designCode,
          designNumber: product.designNumber,
          version: product.version,
        });

      const sku =
        options.preserveProductSku &&
        product.sku?.trim()
          ? product.sku.trim().toUpperCase()
          : generatedSku;

      row.getCell(COLUMN.PRODUCT_NAME).value = product.productName;
      row.getCell(COLUMN.VARIATION).value = product.size;
      row.getCell(COLUMN.PRICE).value = product.price;

      // This field is edited and stored as the exact value the user wants in
      // Column G. Export it unchanged instead of deriving it from Meesho Price.
      row.getCell(COLUMN.WRONG_DEFECTIVE_RETURN_DISCOUNT).value =
        getWrongDefectiveReturnDiscount(
          product.wrongDefectiveReturnsPrice,
        );

      row.getCell(COLUMN.MRP).value = product.mrp;
      row.getCell(COLUMN.GST).value = product.gst;
      row.getCell(COLUMN.HSN).value = product.hsn;
      row.getCell(COLUMN.WEIGHT).value = product.weight;
      row.getCell(COLUMN.INVENTORY).value = product.inventory;
      row.getCell(COLUMN.COUNTRY).value = product.country;

      row.getCell(COLUMN.MANUFACTURER).value = product.manufacturer;
      row.getCell(COLUMN.MANUFACTURER_ADDRESS).value =
        product.manufacturerAddress;
      row.getCell(COLUMN.MANUFACTURER_PINCODE).value =
        product.manufacturerPincode;

      row.getCell(COLUMN.PACKER).value = product.packer;
      row.getCell(COLUMN.PACKER_ADDRESS).value = product.packerAddress;
      row.getCell(COLUMN.PACKER_PINCODE).value = product.packerPincode;

      row.getCell(COLUMN.IMPORTER).value = product.importer;
      row.getCell(COLUMN.IMPORTER_ADDRESS).value = product.importerAddress;
      row.getCell(COLUMN.IMPORTER_PINCODE).value = product.importerPincode;

      row.getCell(COLUMN.COLOR).value = product.color;
      row.getCell(COLUMN.MODEL).value = model.model;
      row.getCell(COLUMN.GENERIC_NAME).value = product.genericName;
      row.getCell(COLUMN.MATERIAL).value = product.material;
      row.getCell(COLUMN.QUANTITY).value = product.quantity;
      row.getCell(COLUMN.LENGTH).value = product.length;
      row.getCell(COLUMN.WIDTH).value = product.width;
      row.getCell(COLUMN.THEME).value = product.theme;
      row.getCell(COLUMN.TYPE).value = product.type;

      row.getCell(COLUMN.IMAGE1).value = product.image1;
      row.getCell(COLUMN.IMAGE2).value = product.image2;
      row.getCell(COLUMN.IMAGE3).value = product.image3;
      row.getCell(COLUMN.IMAGE4).value = product.image4;

      row.getCell(COLUMN.STYLE_ID).value = sku;
      row.getCell(COLUMN.SKU).value = sku;
      row.getCell(COLUMN.BRAND_NAME).value = product.brand;
      row.getCell(COLUMN.GROUP_ID).value = product.groupId;
      row.getCell(COLUMN.DESCRIPTION).value = product.description;
      row.getCell(COLUMN.BRAND).value = product.brand;

      row.commit();
      rowNumber += 1;
    }
  }

  if (rowNumber === 6) {
    throw new Error("No phone models were found in the products added.");
  }

  const output = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    options.fileName?.trim() ||
      "meesho-batch-export.xlsx",
  );
}
