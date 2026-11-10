import { productTitleKeywordIssues, productTitleWarnings } from "@/components/listing-tool/original/lib/product-title-validation";

export default function ProductTitleNotice({ titles }: { titles: readonly unknown[] }) {
  const errors = [...new Set(titles.flatMap((title) => productTitleKeywordIssues(title).errors))];
  const warnings = productTitleWarnings(titles);
  if (!errors.length && !warnings.length) return null;
  return <div role={errors.length ? "alert" : "status"} aria-label="Meesho title review" className={`mt-4 rounded-xl border px-4 py-3 text-sm ${errors.length ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
    <p className="font-semibold">Meesho title review</p>
    {!!errors.length && <p className="mt-1">Known error keywords: {errors.join(", ")}. Edit or regenerate these titles before exporting.</p>}
    {!!warnings.length && <p className="mt-1">Review keywords: {warnings.join(", ")}. These were warnings in your Meesho report, not automatic title errors. Check brand/model permissions and category rules in the Supplier Panel. Actual compatibility and design details have not been removed.</p>}
    <p className="mt-1 text-xs">Checks use known rejection feedback. Final approval is decided by Meesho.</p>
  </div>;
}
