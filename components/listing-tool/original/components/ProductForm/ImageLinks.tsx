"use client";

import { Image as ImageIcon, Link2 } from "lucide-react";
import type { UseFormRegister } from "react-hook-form";

import type { FormData } from "./ProductCard";
import MeeshoImageUpload from "@/components/listing-tool/original/components/MeeshoImageUpload";
import MeeshoImageSetUpload from "@/components/listing-tool/original/components/MeeshoImageSetUpload";
import type { MeeshoImageField } from "@/components/listing-tool/original/lib/meesho-upload-contract";

type Props = {
  register: UseFormRegister<FormData>;
  rowId: string;
  values: Pick<FormData, MeeshoImageField>;
  onChange: (field: MeeshoImageField, value: string) => void;
};

const IMAGE_FIELDS = ["image1", "image2", "image3", "image4"] as const;

export default function ImageLinks({ register, rowId, values, onChange }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <ImageIcon size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Product images</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a main image and up to three supporting images together, or paste individual links. Image 1 is the primary listing image.
          </p>
        </div>
      </div>

      <div className="px-5 pt-2 sm:px-6"><MeeshoImageSetUpload rowId={rowId} values={values} onChange={onChange} /></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {IMAGE_FIELDS.map((field, index) => (
          <div key={field} className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Image {index + 1}</span>
              {index === 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700">
                  Primary
                </span>
              )}
            </span>
            <span className="relative block">
              <Link2 size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input
                {...register(field)}
                type="url"
                aria-label={`Image ${index + 1} URL`}
                placeholder="https://example.com/product-image.jpg"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
              />
            </span>
            <MeeshoImageUpload target={{ rowId, field }} value={values[field]} onChange={url => onChange(field, url)} />
          </div>
        ))}
      </div>
    </section>
  );
}
