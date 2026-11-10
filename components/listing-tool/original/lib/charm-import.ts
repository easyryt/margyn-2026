export type CharmImportItem = {
  sheet: string;
  rowNumber: number;
  designNumber: string;
  familyKey: string;
  version: number;
  data: Record<string, unknown>;
};

export type CharmImportSheet = {
  name: string;
  rows: unknown[][];
};

type CharmWorkbookCell = {
  value: unknown;
  readonly text: string;
};

type ColumnSpec = {
  field: string;
  names: string[];
  number?: boolean;
};

const COLUMNS: ColumnSpec[] = [
  { field: "productName", names: ["product name"] },
  { field: "size", names: ["variation", "size"] },
  { field: "price", names: ["meesho price", "price"], number: true },
  { field: "wrongDefectiveReturnsPrice", names: ["wrong/defective returns price", "wrong defective returns price"], number: true },
  { field: "mrp", names: ["mrp"], number: true },
  { field: "gst", names: ["gst %", "gst"], number: true },
  { field: "hsn", names: ["hsn id", "hsn"] },
  { field: "weight", names: ["net weight (gms)", "weight"], number: true },
  { field: "inventory", names: ["inventory", "stock"], number: true },
  { field: "country", names: ["country of origin", "country"] },
  { field: "manufacturer", names: ["manufacturer name", "manufacturer"] },
  { field: "manufacturerAddress", names: ["manufacturer address"] },
  { field: "manufacturerPincode", names: ["manufacturer pincode"] },
  { field: "packer", names: ["packer name", "packer"] },
  { field: "packerAddress", names: ["packer address"] },
  { field: "packerPincode", names: ["packer pincode"] },
  { field: "importer", names: ["importer name", "importer"] },
  { field: "importerAddress", names: ["importer address"] },
  { field: "importerPincode", names: ["importer pincode"] },
  { field: "color", names: ["color"] },
  { field: "genericName", names: ["generic name"] },
  { field: "material", names: ["material"] },
  { field: "quantity", names: ["net quantity (n)", "quantity"], number: true },
  { field: "length", names: ["product length (cm)", "length"], number: true },
  { field: "width", names: ["product width(cm)", "product width (cm)", "width"], number: true },
  { field: "theme", names: ["theme"] },
  { field: "type", names: ["type"] },
  { field: "image1", names: ["image 1 (front)", "image 1"] },
  { field: "image2", names: ["image 2"] },
  { field: "image3", names: ["image 3"] },
  { field: "image4", names: ["image 4"] },
  { field: "styleId", names: ["product id / style id", "style id", "product id"] },
  { field: "sku", names: ["sku id", "seller sku id", "sku"] },
  { field: "brand", names: ["brand name"] },
  { field: "groupId", names: ["group id"] },
  { field: "description", names: ["product description", "description"] },
];

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function readCharmWorkbookCellText(cell: CharmWorkbookCell) {
  return cell.value == null ? "" : cell.text;
}

function isMeeshoFillSheet(sheet: CharmImportSheet) {
  return /\bfill[\s-]+this\b/i.test(clean(sheet.name));
}

function cleanHeader(value: unknown) {
  return clean(value).replace(/\*/g, "").toLocaleLowerCase();
}

function headerMatches(value: unknown, name: string) {
  const header = cleanHeader(value);
  return header === name || header.startsWith(`${name} `);
}

function findColumn(headers: unknown[], names: string[]) {
  for (const name of names) {
    const index = headers.findIndex((header) => headerMatches(header, name));
    if (index >= 0) return index;
  }
  return -1;
}

function stringCell(row: unknown[], headers: unknown[], names: string[]) {
  const index = findColumn(headers, names);
  if (index < 0) return undefined;
  const value = clean(row[index]);
  return value || undefined;
}

function numberCell(row: unknown[], headers: unknown[], spec: ColumnSpec) {
  const value = stringCell(row, headers, spec.names);
  if (value === undefined) return undefined;
  const number = Number(value.replace(/[₹,%\s]/g, "").replace(/,/g, ""));
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${spec.names[0]} must be a number of 0 or more.`);
  }
  return number;
}

function skuIdentity(sku: string) {
  const match = sku.match(/-([0-9]+(?:\.[0-9]+)*)\.V([0-9]+)$/i);
  if (!match) {
    throw new Error(`SKU "${sku}" must end with a design number and version, for example -176.1.V1.`);
  }
  const designPath = match[1];
  const designParts = designPath.split(".");
  const designNumber = designParts.length > 1
    ? designParts.slice(0, -1).join(".")
    : designPath;
  const version = Number(match[2]);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error(`SKU "${sku}" contains an invalid version.`);
  }
  return {
    designNumber,
    familyKey: sku.replace(/\.V[0-9]+$/i, ""),
    version,
  };
}

export function parseCharmWorkbookRows(
  sheets: readonly CharmImportSheet[],
): CharmImportItem[] {
  const items: CharmImportItem[] = [];
  const errors: string[] = [];
  let supportedSheets = 0;

  const meeshoFillSheets = sheets.filter(isMeeshoFillSheet);
  const candidateSheets = meeshoFillSheets.length
    ? meeshoFillSheets
    : sheets;

  for (const sheet of candidateSheets) {
    const headerIndex = sheet.rows.findIndex((row) =>
      Array.isArray(row) &&
      findColumn(row, ["product name"]) >= 0 &&
      findColumn(row, ["sku id", "seller sku id", "sku"]) >= 0,
    );
    if (headerIndex < 0) continue;
    supportedSheets += 1;
    const headers = sheet.rows[headerIndex];

    for (let rowIndex = headerIndex + 1; rowIndex < sheet.rows.length; rowIndex += 1) {
      const row = sheet.rows[rowIndex] ?? [];
      if (row.some((value) => /^(tutorial link|watch explainer video)$/i.test(clean(value)))) continue;
      const productName = stringCell(row, headers, ["product name"]);
      const rawSku = stringCell(row, headers, ["sku id", "seller sku id", "sku"]);
      if (!productName && !rawSku) continue;

      try {
        if (!productName) throw new Error("Product Name is required.");
        if (!rawSku) throw new Error("SKU ID is required.");
        const sku = rawSku.toUpperCase();
        const identity = skuIdentity(sku);
        const data: Record<string, unknown> = {};

        for (const spec of COLUMNS) {
          const value = spec.number
            ? numberCell(row, headers, spec)
            : stringCell(row, headers, spec.names);
          if (value !== undefined) data[spec.field] = value;
        }
        data.productName = productName;
        data.sku = sku;
        data.styleId = clean(data.styleId).toUpperCase() || sku;
        data.version = String(identity.version);
        if (data.wrongDefectiveReturnsPrice === undefined) {
          data.wrongDefectiveReturnsPrice = 1;
        }
        const model = stringCell(row, headers, ["compatible models", "compatible model", "phone model"]);
        if (model) data.models = [{ model }];

        items.push({
          sheet: sheet.name,
          rowNumber: rowIndex + 1,
          ...identity,
          data,
        });
      } catch (error) {
        errors.push(`${sheet.name} row ${rowIndex + 1}: ${error instanceof Error ? error.message : "Invalid charm row."}`);
      }
    }
  }

  if (!supportedSheets) {
    throw new Error("No supported Meesho product table was found in this workbook.");
  }
  if (!items.length && !errors.length) {
    throw new Error("No charm rows were found in this workbook.");
  }

  const versions = new Map<string, CharmImportItem[]>();
  const families = new Map<string, Set<string>>();
  for (const item of items) {
    const versionKey = `${item.designNumber}::${item.version}`;
    versions.set(versionKey, [...(versions.get(versionKey) ?? []), item]);
    const designFamilies = families.get(item.designNumber) ?? new Set<string>();
    designFamilies.add(item.familyKey);
    families.set(item.designNumber, designFamilies);
  }
  for (const [, matches] of versions) {
    if (matches.length > 1) {
      errors.push(`Design ${matches[0].designNumber} contains ${matches.length} rows for V${matches[0].version}.`);
    }
  }
  for (const [designNumber, designFamilies] of families) {
    if (designFamilies.size > 1) {
      errors.push(`Design ${designNumber} contains more than one charm SKU family.`);
    }
  }
  if (errors.length) {
    throw new Error(`Charm import stopped. ${errors.slice(0, 3).join(" ")}${errors.length > 3 ? ` ${errors.length - 3} more error(s).` : ""}`);
  }

  return items.sort((first, second) =>
    first.designNumber.localeCompare(second.designNumber, undefined, { numeric: true }) ||
    first.version - second.version,
  );
}
