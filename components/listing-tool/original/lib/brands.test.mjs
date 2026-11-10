// The original implementation currently uses FBO; retain that SKU code in Margyn.
import assert from "node:assert/strict";
import test from "node:test";
import { BRANDS, getBrandCode, getBrandSupplyDetails, updateSkuBrand, applyProductBrand } from "./brands.ts";

const exampleSku = "MBRO-MC-AP-IP16-UVV-APF-WL-TRNSPT-317.1.V1";

test("offers all three brands with stable SKU codes", () => {
  assert.deepEqual(BRANDS, ["Mobiro", "Sadarbazar", "Fibio"]);
  assert.equal(getBrandCode("Mobiro"), "MBRO");
  assert.equal(getBrandCode(" Sadarbazar "), "SDBR");
  assert.equal(getBrandCode("fibio"), "FBO");
});

test("updates only the SKU brand prefix, retaining model, design and version", () => {
  assert.equal(updateSkuBrand(exampleSku, "Sadarbazar"), "SDBR-MC-AP-IP16-UVV-APF-WL-TRNSPT-317.1.V1");
  assert.equal(updateSkuBrand(exampleSku, "Fibio"), "FBO-MC-AP-IP16-UVV-APF-WL-TRNSPT-317.1.V1");
  assert.equal(updateSkuBrand("SDBR-MC-WITH CHARMS-317.1.V6", "Mobiro"), "MBRO-MC-WITH CHARMS-317.1.V6");
  assert.equal(updateSkuBrand("", "Mobiro"), "");
});

test("fills all six manufacturer and packer fields with the selected brand", () => {
  for (const brand of BRANDS) {
    assert.deepEqual(getBrandSupplyDetails(brand), {
      manufacturer: brand, manufacturerAddress: brand, manufacturerPincode: brand,
      packer: brand, packerAddress: brand, packerPincode: brand,
    });
  }
});

test("brand changes preserve other product data and update SKU and style ID", () => {
  const product = {
    brand: "Mobiro", sku: exampleSku, styleId: exampleSku,
    price: 121, wrongDefectiveReturnsPrice: 2, image1: "image-url", version: "1",
    manufacturerAddress: "Previous custom value",
  };
  const changed = applyProductBrand(product, "Sadarbazar");
  assert.equal(changed.brand, "Sadarbazar");
  assert.equal(changed.sku, updateSkuBrand(exampleSku, "Sadarbazar"));
  assert.equal(changed.styleId, changed.sku);
  assert.equal(changed.manufacturerAddress, "Sadarbazar");
  assert.equal(changed.price, 121);
  assert.equal(changed.wrongDefectiveReturnsPrice, 2);
  assert.equal(changed.image1, product.image1);
  assert.equal(product.brand, "Mobiro");
  assert.equal(product.manufacturerAddress, "Previous custom value");
});
