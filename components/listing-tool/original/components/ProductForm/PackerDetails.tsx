type Props = {
  register: any;
};

export default function PackerDetails({
  register,
}: Props) {
  return (
    <div className="mt-10">

      <h3 className="mb-5 text-lg font-semibold text-slate-900">
        Packer Details
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        {/* Packer Name */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Packer Name
          </label>

          <input
            {...register("packer")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Address */}

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Packer Address
          </label>

          <input
            {...register("packerAddress")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        {/* Pincode */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Packer Pincode
          </label>

          <input
            {...register("packerPincode")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

      </div>

    </div>
  );
}