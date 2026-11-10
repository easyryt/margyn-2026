type Props = {
  register: any;
};

export default function ImporterDetails({
  register,
}: Props) {
  return (
    <div className="mt-10">

      <h3 className="mb-5 text-lg font-semibold text-slate-900">
        Importer Details
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        {/* Importer Name */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Importer Name
          </label>

          <input
            {...register("importer")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Address */}

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Importer Address
          </label>

          <input
            {...register("importerAddress")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Pincode */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Importer Pincode
          </label>

          <input
            {...register("importerPincode")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

      </div>

    </div>
  );
}