"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { Product, PriceTier } from "@/lib/types";
import Dialog from "./dialog";
import { Icon } from "./icons";
const categories = [
  "Courier bags",
  "Shipping boxes",
  "Labels & stickers",
  "Packing tapes",
  "Protective packaging",
  "Custom packaging",
];
export default function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const [images, setImages] = useState(product?.images || []),
    [uploading, setUploading] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [price, setPrice] = useState(product?.price || 0.01),
    [minimum, setMinimum] = useState(product?.minOrder || 1),
    [tiers, setTiers] = useState<PriceTier[]>(product?.tiers.slice(1) || []);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    if (files.length + images.length > 8) {
      setError("Use up to 8 product images.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024)
          throw new Error("Choose images smaller than 5 MB.");
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Image upload failed.");
        setImages((current) => [...current, data.url]);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!images.length) {
      setError("Upload a product image first.");
      return;
    }
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const body = {
      name: form.get("name"),
      sku: form.get("sku"),
      category: form.get("category"),
      description: form.get("description"),
      price,
      compareAt: Number(form.get("compareAt")),
      unit: form.get("unit"),
      minOrder: minimum,
      stock: Number(form.get("stock")),
      image: images[0],
      images,
      status: form.get("status"),
      featured: form.get("featured") === "on",
      vendor: form.get("vendor"),
      verified: form.get("verified") === "on",
      specification: form.get("specification"),
      packSize: Number(form.get("packSize")),
      sizes: String(form.get("sizes"))
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean),
      gstRate: Number(form.get("gstRate")),
      dispatchDays: Number(form.get("dispatchDays")),
      shipsFrom: form.get("shipsFrom"),
      tiers: [{ minCartons: minimum, price }, ...tiers],
    };
    try {
      const response = await fetch(
        product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: product ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save the product.");
      onSaved(data.product);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      title={product ? "Edit product" : "Add a new product"}
      onClose={() => {
        if (!saving && !uploading) onClose();
      }}
      wide
    >
      <form className="product-form" onSubmit={save}>
        <p className="muted editor-intro">
          Manage product details, gallery, carton sizes and wholesale pricing.
        </p>
        <div className="editor-grid">
          <div>
            <label
              className={`upload-area ${images.length ? "has-image" : ""}`}
            >
              {images.length ? (
                <img src={images[0]} alt="Product preview" />
              ) : (
                <>
                  <Icon name="upload" size={30} />
                  <strong>Add product photos</strong>
                  <span>JPG, PNG or WebP · 5 MB each</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => void upload(event.target.files)}
                disabled={saving || uploading}
                aria-label="Upload product image"
              />
              <span className="upload-caption">
                {uploading
                  ? "Uploading to ImageKit…"
                  : images.length
                    ? "Add more images"
                    : "Choose images"}
              </span>
            </label>
            <div className="editor-gallery">
              {images.map((url, index) => (
                <div key={url}>
                  <button
                    type="button"
                    onClick={() =>
                      setImages((current) => [
                        url,
                        ...current.filter((image) => image !== url),
                      ])
                    }
                    aria-label={`Set image ${index + 1} as primary`}
                  >
                    <img src={url} alt={`Product image ${index + 1}`} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove image ${index + 1}`}
                    onClick={() =>
                      setImages((current) =>
                        current.filter((image) => image !== url),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="editor-gallery-help">
              First image is the cover. Click a thumbnail to make it the cover.
            </p>
          </div>
          <div className="form-fields">
            <label>
              Product name
              <input
                name="name"
                defaultValue={product?.name}
                required
                maxLength={180}
              />
            </label>
            <div className="form-row">
              <label>
                SKU
                <input
                  name="sku"
                  defaultValue={product?.sku}
                  required
                  maxLength={60}
                />
              </label>
              <label>
                Category
                <input
                  name="category"
                  list="category-options"
                  defaultValue={product?.category || categories[0]}
                  required
                  maxLength={60}
                />
                <datalist id="category-options">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </label>
            </div>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={product?.description}
                required
                minLength={10}
                maxLength={6000}
                rows={4}
              />
            </label>
            <label>
              Specification
              <input
                name="specification"
                defaultValue={product?.specification || "51–60 Micron"}
                maxLength={100}
                required
                placeholder="e.g. 51–60 Micron"
              />
            </label>
          </div>
        </div>
        <div className="form-fields">
          <div className="form-row form-row-three">
            <label>
              Price per piece (₹)
              <input
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                required
                value={price}
                onChange={(event) => setPrice(Number(event.target.value))}
              />
            </label>
            <label>
              Original price per piece (₹)
              <input
                name="compareAt"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                defaultValue={product?.compareAt || ""}
              />
            </label>
            <label>
              Unit label
              <input
                name="unit"
                defaultValue={product?.unit || "piece"}
                required
                maxLength={60}
              />
            </label>
          </div>
          <div className="form-row form-row-three">
            <label>
              Pieces per carton
              <input
                name="packSize"
                type="number"
                min="1"
                max="100000"
                step="1"
                required
                defaultValue={product?.packSize || 50}
              />
            </label>
            <label>
              Available stock (cartons)
              <input
                name="stock"
                type="number"
                min="0"
                max="1000000"
                step="1"
                required
                defaultValue={product?.stock ?? 0}
              />
            </label>
            <label>
              Minimum order (cartons)
              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                required
                value={minimum}
                onChange={(event) => setMinimum(Number(event.target.value))}
              />
            </label>
          </div>
          <p className="form-section-note">
            Inventory is shared across the product’s listed sizes. Prices are
            entered per piece, excluding GST.
          </p>
          <label>
            Available sizes (comma separated)
            <input
              name="sizes"
              defaultValue={product?.sizes.join(", ") || "6×8, 8×10, 10×14"}
              required
              placeholder="6×8, 8×10, 10×14"
              maxLength={800}
            />
          </label>
          <div className="tier-editor">
            <div className="tier-editor-heading">
              <h3>Wholesale price tiers</h3>
              <button
                type="button"
                className="text-button"
                disabled={tiers.length >= 7}
                onClick={() =>
                  setTiers((current) => [
                    ...current,
                    {
                      minCartons:
                        Math.max(
                          minimum,
                          ...current.map((tier) => tier.minCartons),
                        ) + 1,
                      price,
                    },
                  ])
                }
              >
                <Icon name="plus" size={16} />
                Add tier
              </button>
            </div>
            <p>
              Base tier: {minimum} CTN at ₹{price.toFixed(2)} per piece. Add
              lower prices for larger quantities.
            </p>
            {tiers.map((tier, index) => (
              <div className="tier-editor-row" key={index}>
                <label>
                  Minimum cartons
                  <input
                    type="number"
                    min={minimum + 1}
                    max="10000"
                    step="1"
                    required
                    value={tier.minCartons}
                    onChange={(event) =>
                      setTiers((current) =>
                        current.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                minCartons: Number(event.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Price per piece (₹)
                  <input
                    type="number"
                    min="0.01"
                    max={price}
                    step="0.01"
                    required
                    value={tier.price}
                    onChange={(event) =>
                      setTiers((current) =>
                        current.map((item, i) =>
                          i === index
                            ? { ...item, price: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove tier ${index + 2}`}
                  onClick={() =>
                    setTiers((current) => current.filter((_, i) => i !== index))
                  }
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
            ))}
          </div>
          <div className="form-row form-row-three">
            <label>
              GST rate (%)
              <select name="gstRate" defaultValue={product?.gstRate ?? 0}>
                {[0, 5, 12, 18, 28].map((rate) => (
                  <option value={rate} key={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dispatch time (business days)
              <input
                name="dispatchDays"
                type="number"
                min="1"
                max="60"
                required
                defaultValue={product?.dispatchDays || 2}
              />
            </label>
            <label>
              Ships from
              <input
                name="shipsFrom"
                defaultValue={product?.shipsFrom || "India"}
                required
                maxLength={100}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Vendor name
              <input
                name="vendor"
                defaultValue={product?.vendor || "Margyn"}
                required
                maxLength={80}
              />
            </label>
            <label>
              Visibility
              <select
                name="status"
                aria-label="Visibility"
                defaultValue={product?.status || "draft"}
              >
                <option value="draft">Draft — only visible to admins</option>
                <option value="published">Published — visible in store</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="verified"
                defaultChecked={product?.verified}
              />
              <span>Display verified vendor badge</span>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={product?.featured}
              />
              <span>Feature this product</span>
            </label>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <p>Published changes appear in your storefront.</p>
          <button
            type="button"
            className="button button-outline"
            disabled={saving || uploading}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button-green"
            disabled={saving || uploading}
          >
            {saving ? "Saving…" : uploading ? "Uploading…" : "Save product"}
            <Icon name="check" size={17} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
