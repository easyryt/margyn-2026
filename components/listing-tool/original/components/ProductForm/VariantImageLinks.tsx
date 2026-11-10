"use client";

import { Image as ImageIcon } from "lucide-react";

import type { Product } from "./ProductCard";
import MeeshoImageUpload from "@/components/listing-tool/original/components/MeeshoImageUpload";
import MeeshoImageSetUpload from "@/components/listing-tool/original/components/MeeshoImageSetUpload";

export type VariantImageField = "image1" | "image2" | "image3" | "image4";

type Props = {
  variant: Product;
  onChange: (field: VariantImageField, value: string) => void;
};

const IMAGE_FIELDS: Array<{
  field: VariantImageField;
  label: string;
  placeholder: string;
}> = [
  {
    field: "image1",
    label: "Image 1",
    placeholder: "Paste primary image link",
  },
  {
    field: "image2",
    label: "Image 2",
    placeholder: "Paste second image link",
  },
  {
    field: "image3",
    label: "Image 3",
    placeholder: "Paste third image link",
  },
  {
    field: "image4",
    label: "Image 4",
    placeholder: "Paste fourth image link",
  },
];

export default function VariantImageLinks({ variant, onChange }: Props) {
  return (
    <div className="mt-3 border-t border-violet-200 pt-3">
      <div className="mb-3 flex items-center gap-2">
        <ImageIcon size={16} className="text-violet-700" />

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Variant Images
          </p>

          <p className="text-xs text-slate-500">
            These links are independent from the parent product.
          </p>
        </div>
      </div>

      <MeeshoImageSetUpload rowId={variant.id} values={variant} onChange={onChange} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {IMAGE_FIELDS.map(({ field, label, placeholder }) => (
          <div key={field}>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {label}
            </label>

            <input
              type="url"
              value={variant[field] || ""}
              onChange={(event) => onChange(field, event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <MeeshoImageUpload target={{ rowId: variant.id, field }} value={variant[field] || ""} onChange={url => onChange(field, url)} />
          </div>
        ))}
      </div>

      {variant.image1 && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-slate-500">Image 1 preview</p>

          <img
            src={variant.image1}
            alt={`Variant V${variant.variantNumber} preview`}
            className="h-20 w-20 rounded-lg border border-violet-200 bg-white object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}
