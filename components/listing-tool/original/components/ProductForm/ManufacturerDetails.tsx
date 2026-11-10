type Props = {
  register: any;
};

export default function ManufacturerDetails({
  register,
}: Props) {
  return (
    <div className="mt-10">

      <h3 className="mb-5 text-lg font-semibold text-slate-900">
        Manufacturer Details
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        {/* Manufacturer */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Manufacturer Name
          </label>

          <input
            {...register("manufacturer")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Address */}

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Manufacturer Address
          </label>

          <input
            {...register("manufacturerAddress")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Pincode */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Manufacturer Pincode
          </label>

          <input
            {...register("manufacturerPincode")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

      </div>

    </div>
  );
}