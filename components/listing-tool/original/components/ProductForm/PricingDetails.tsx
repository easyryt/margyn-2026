import type { UseFormRegister } from "react-hook-form";

import type { FormData } from "./ProductCard";

type Props = {
  register: UseFormRegister<FormData>;
};

export default function PricingDetails({
  register,
}: Props) {
  return (
    <div className="mt-8">

      <h3 className="mb-5 text-lg font-semibold text-slate-900">
        Pricing & Inventory
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        {/* Price */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Meesho Price (V1)
          </label>

          <input
            aria-label="Meesho Price (V1)"
            type="number"
            min="0"
            step="any"
            {...register("price", {
              valueAsNumber: true,
              required: true,
              min: 0,
            })}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Enter any starting price. Variants add ₹1 through ₹4, then repeat
            from your starting price (for example: ₹121, ₹122, ₹123, ₹124, ₹125, ₹121).
          </p>
        </div>

        {/* Wrong/Defective Return Discount */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Wrong/Defective Return Discount (₹)
          </label>

          <input
            type="number"
            min="0"
            max="30"
            step="1"
            {...register("wrongDefectiveReturnsPrice", {
              valueAsNumber: true,
              required: true,
              min: 0,
              max: 30,
            })}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Defaults to ₹2. Enter a discount from ₹0 to ₹30.
          </p>
        </div>

        {/* MRP */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            MRP
          </label>

          <input
            type="number"
            {...register("mrp", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* GST */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            GST %
          </label>

          <input
            type="number"
            {...register("gst", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* HSN */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            HSN
          </label>

          <input
            {...register("hsn")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Weight */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Weight (g)
          </label>

          <input
            type="number"
            {...register("weight", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Inventory */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Inventory
          </label>

          <input
            type="number"
            {...register("inventory", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Country */}

        <div className="md:col-span-3">
          <label className="mb-2 block text-sm font-medium">
            Country of Origin
          </label>

          <input
            {...register("country")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

      </div>

    </div>
  );
}
