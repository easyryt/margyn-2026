import type { Product } from "../components/ProductForm/ProductCard";
import { applyProductBrand } from "./brands";
import {
  DEFAULT_WRONG_DEFECTIVE_RETURN_DISCOUNT,
  getVariantPrice,
  getWrongDefectiveReturnDiscount,
} from "./pricing";

const TEXT_FIELDS = [
  "productName", "description", "brand", "category", "genericName",
  "material", "color", "theme", "type", "hsn", "country",
  "manufacturer", "manufacturerAddress", "manufacturerPincode",
  "packer", "packerAddress", "packerPincode", "importer",
  "importerAddress", "importerPincode", "size", "designId", "designName",
  "designCode", "designNumber", "sku", "styleId", "printType", "finish",
  "version", "image1", "image2", "image3", "image4", "groupId",
] as const;

const NUMBER_FIELDS = [
  "price", "wrongDefectiveReturnsPrice", "mrp", "gst", "weight",
  "inventory", "quantity", "length", "width",
] as const;

export type ProductEditorField =
  | typeof TEXT_FIELDS[number]
  | typeof NUMBER_FIELDS[number]
  | "models";
export type ProductEditorForm = Record<ProductEditorField, string>;
export type ProductEditorUpdate = {
  product: Product;
  payload: Record<string, unknown>;
  direct: boolean;
};

const SHARED_FIELDS: ProductEditorField[] = [
  "brand", "category", "genericName", "material", "color", "theme", "type",
  "gst", "hsn", "weight", "country", "manufacturer", "manufacturerAddress",
  "manufacturerPincode", "packer", "packerAddress", "packerPincode",
  "importer", "importerAddress", "importerPincode", "size", "quantity",
  "length", "width", "printType", "finish", "groupId", "models",
];

export function productEditorVersion(product: Product) {
  if (!product.parentId) return 1;
  const version = Number(String(product.variantNumber ?? product.version).replace(/^V/i, ""));
  return Number.isInteger(version) && version >= 2 ? version : 2;
}

export function productToEditorForm(product: Product): ProductEditorForm {
  const form = {} as ProductEditorForm;
  for (const field of TEXT_FIELDS) form[field] = String(product[field] ?? "");
  for (const field of NUMBER_FIELDS) {
    const value = product[field];
    form[field] = value != null && Number.isFinite(Number(value)) ? String(value) : "";
  }
  form.wrongDefectiveReturnsPrice = String(
    getWrongDefectiveReturnDiscount(product.wrongDefectiveReturnsPrice),
  );
  form.models = [...new Set((product.models ?? []).map(({ model }) => model.trim()).filter(Boolean))].join("\n");
  return form;
}

export function hasProductEditorChanges(product: Product, form: ProductEditorForm) {
  const initial = productToEditorForm(product);
  return (Object.keys(initial) as ProductEditorField[]).some((field) => initial[field] !== form[field]);
}

export function changeProductEditorField(
  form: ProductEditorForm,
  field: ProductEditorField,
  value: string,
): ProductEditorForm {
  if (field === "brand") return applyProductBrand(form, value);
  if (field === "category") {
    return {
      ...form,
      category: value,
      genericName: !form.genericName || form.genericName === form.category ? value : form.genericName,
    };
  }
  return {
    ...form,
    [field]: ["sku", "styleId", "designCode"].includes(field) ? value.toUpperCase() : value,
  };
}

export function buildProductEditorPayload(product: Product, form: ProductEditorForm) {
  for (const field of ["productName", "sku", ...(!product.parentId ? ["designName", "designCode", "designNumber"] : [])]) {
    if (!form[field as ProductEditorField].trim()) {
      throw new Error(`${field === "productName" ? "Product Name" : field} is required.`);
    }
  }
  const models = [...new Map(
    form.models.split(/\r?\n/).map((model) => model.trim()).filter(Boolean)
      .map((model) => [model.toLocaleLowerCase(), model]),
  ).values()];
  if (!models.length) throw new Error("Add at least one compatible model.");

  const payload: Record<string, unknown> = {};
  for (const field of TEXT_FIELDS) payload[field] = form[field].trim();
  for (const field of NUMBER_FIELDS) {
    const value = field === "wrongDefectiveReturnsPrice"
      ? form[field].trim() || String(DEFAULT_WRONG_DEFECTIVE_RETURN_DISCOUNT)
      : form[field].trim();
    if (!value || !Number.isFinite(Number(value)) || Number(value) < 0) {
      throw new Error(`${field} must be a number of 0 or more.`);
    }
    payload[field] = Number(value);
  }
  if (Number(payload.wrongDefectiveReturnsPrice) > 30) {
    throw new Error("Wrong/Defective Return Discount must be ₹30 or less.");
  }
  payload.sku = form.sku.trim().toUpperCase();
  payload.styleId = form.styleId.trim().toUpperCase();
  payload.designCode = form.designCode.trim().toUpperCase();
  payload.models = models.map((model) => ({ model }));
  payload.version = String(productEditorVersion(product));
  if (product.parentId) {
    for (const field of ["designId", "designName", "designCode", "designNumber"]) delete payload[field];
  } else if (form.designId === String(product.designId ?? "")) {
    delete payload.designId;
  } else {
    payload.designId = form.designId || null;
  }
  return payload;
}

// Plan all writes before the first request. Parent writes run first; explicit
// variant cell edits take precedence over the parent's price/shared defaults.
export function planProductEditorUpdates(
  products: readonly Product[],
  forms: Record<string, ProductEditorForm>,
  saveIds: readonly string[],
  applySharedFields = false,
): ProductEditorUpdate[] {
  const selected = new Set(saveIds);
  const plans = new Map<string, ProductEditorUpdate>();
  for (const product of products) {
    const form = forms[product.id] ?? productToEditorForm(product);
    if (!selected.has(product.id) || !hasProductEditorChanges(product, form)) continue;
    try {
      plans.set(product.id, { product, payload: buildProductEditorPayload(product, form), direct: true });
    } catch (error) {
      throw new Error(`V${productEditorVersion(product)}: ${error instanceof Error ? error.message : "Invalid row."}`);
    }
  }

  for (const parent of products.filter((product) => !product.parentId)) {
    const parentPlan = plans.get(parent.id);
    if (!parentPlan) continue;
    const parentForm = forms[parent.id];
    const parentInitial = productToEditorForm(parent);
    const brandChanged = parentForm.brand !== parentInitial.brand;
    const priceChanged = Number(parentForm.price) !== Number(parentInitial.price);
    for (const variant of products.filter((product) =>
      product.parentId === parent.id && (product.variantType ?? "standard") === "standard",
    )) {
      const directPlan = plans.get(variant.id);
      const initial = productToEditorForm(variant);
      const working = directPlan ? forms[variant.id] : initial;
      const inherited = { ...working };
      const inheritedFields = new Set<ProductEditorField>();
      if (brandChanged || (applySharedFields && parentForm.brand !== initial.brand)) {
        const branded = applyProductBrand(initial, parentForm.brand);
        for (const field of ["brand", "manufacturer", "manufacturerAddress", "manufacturerPincode", "packer", "packerAddress", "packerPincode", "sku", "styleId"] as const) {
          if (directPlan && working[field] !== initial[field]) continue;
          inherited[field] = branded[field] ?? "";
          inheritedFields.add(field);
        }
      }
      if (applySharedFields) {
        for (const field of SHARED_FIELDS) {
          if (directPlan && working[field] !== initial[field]) continue;
          inherited[field] = parentForm[field];
          inheritedFields.add(field);
        }
      }
      if (priceChanged && (!directPlan || working.price === initial.price)) {
        inherited.price = String(getVariantPrice(Number(parentForm.price), productEditorVersion(variant)));
        inheritedFields.add("price");
      }
      if (!inheritedFields.size) continue;
      if (directPlan) {
        directPlan.payload = buildProductEditorPayload(variant, inherited);
      } else {
        const payload: Record<string, unknown> = {};
        for (const field of inheritedFields) {
          payload[field] = field === "models" ? parentPlan.payload.models
            : NUMBER_FIELDS.includes(field as typeof NUMBER_FIELDS[number]) ? Number(inherited[field])
            : inherited[field].trim();
        }
        plans.set(variant.id, { product: variant, payload, direct: false });
      }
    }
  }
  return [...plans.values()].sort((a, b) => productEditorVersion(a.product) - productEditorVersion(b.product));
}

export function mergeProductEditorSave(
  previous: Product,
  form: ProductEditorForm,
  updated: Product,
  direct: boolean,
) {
  const fresh = productToEditorForm(updated);
  if (direct) return fresh;
  const initial = productToEditorForm(previous);
  for (const field of Object.keys(initial) as ProductEditorField[]) {
    if (form[field] !== initial[field]) fresh[field] = form[field];
  }
  return fresh;
}
