"use client";

import type {
  Control,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";

import type { FormData } from "./ProductCard";

import SectionCard from "./SectionCard";
import BasicInfo from "./BasicInfo";
import PricingDetails from "./PricingDetails";
import ProductAttributes from "./ProductAttributes";
import ManufacturerDetails from "./ManufacturerDetails";
import PackerDetails from "./PackerDetails";
import ImporterDetails from "./ImporterDetails";
import SkuGenerator from "./SkuGenerator";

type Props = {
  register: UseFormRegister<FormData>;
  control: Control<FormData>;
  setValue: UseFormSetValue<FormData>;
  watch: UseFormWatch<FormData>;
  selectedModel: string;
  generatedProductTitle: string;
};

export default function ProductDetails({
  register,
  control,
  setValue,
  watch,
  selectedModel,
  generatedProductTitle,
}: Props) {
  return (
    <SectionCard
      title="Product Details"
      description="Fill product details or use AI image scan to generate the title, Design Name and Design Code."
    >
      <div className="space-y-10">
        <BasicInfo
          register={register}
          control={control}
          setValue={setValue}
          generatedProductTitle={generatedProductTitle}
        />

        <PricingDetails register={register} />

        <ProductAttributes register={register} />

        <ManufacturerDetails register={register} />

        <PackerDetails register={register} />

        <ImporterDetails register={register} />

        <SkuGenerator
          register={register}
          watch={watch}
          selectedModel={selectedModel}
        />

        <div className="border-t border-slate-200 pt-8">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Product Description
          </label>

          <textarea
            rows={6}
            {...register("description")}
            placeholder="Optional manual product description. AI does not generate this field."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>
    </SectionCard>
  );
}
