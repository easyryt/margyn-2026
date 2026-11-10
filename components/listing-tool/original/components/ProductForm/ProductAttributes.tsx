import {
  MATERIALS,
  COLORS,
  THEMES,
  PRODUCT_TYPES,
} from "@/components/listing-tool/original/lib/options";

type Props = {
  register: any;
};

export default function ProductAttributes({
  register,
}: Props) {
  return (
    <div className="mt-10">

      <h3 className="mb-5 text-lg font-semibold text-slate-900">
        Product Attributes
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        {/* Material */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Material
          </label>

          <select
            {...register("material")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            {MATERIALS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {/* Color */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Color
          </label>

          <select
            {...register("color")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            {COLORS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {/* Theme */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Theme
          </label>

          <select
            {...register("theme")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            {THEMES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {/* Type */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Type
          </label>

          <select
            {...register("type")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            {PRODUCT_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {/* Generic Name */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Generic Name
          </label>

          <input
            {...register("genericName")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Size */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Variation / Size
          </label>

          <input
            {...register("size")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Quantity */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Net Quantity
          </label>

          <input
            type="number"
            {...register("quantity", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Length */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Product Length (cm)
          </label>

          <input
            type="number"
            {...register("length", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Width */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Product Width (cm)
          </label>

          <input
            type="number"
            {...register("width", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

      </div>

    </div>
  );
}