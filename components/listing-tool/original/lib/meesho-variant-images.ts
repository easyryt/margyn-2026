import { validateProductImageFiles } from "./meesho-image-set";

export type VariantImageRow = { rowId: string; version: number; title: string; image1: string; image2: string; image3: string; image4: string };
export type VariantImageSelection = { file: File; rowId: string };
export type VariantImageJob = { id: string; rowId: string; version: number; name: string };
export function withVariantMainImage<T extends {id:string;overrides?:{image1?:string}}>(variants: readonly T[],rowId:string,url:string):T[] {
  return variants.map(variant=>variant.id===rowId?{...variant,overrides:{...variant.overrides,image1:url}}:variant);
}
export function arrangeVariantMainImages(files: readonly File[], rows: readonly VariantImageRow[]): VariantImageSelection[] {
  validateProductImageFiles(files, Math.min(50, rows.length));
  const versions = new Map<number, VariantImageRow>();
  for (const row of rows) { if (versions.has(row.version)) throw new Error(`V${row.version} is duplicated. Choose the correct product first.`); versions.set(row.version, row); }
  const used = new Set<string>(), matched: VariantImageSelection[] = [], unknown: File[] = [];
  for (const file of files) {
    const stem = file.name.replace(/\.[^.]+$/, "").trim();
    if (/^sup(?:port(?:ive|ing)?)?[ _-]*\d+/i.test(stem)) throw new Error(`${file.name} looks like a supporting image. This uploader changes variant main images only.`);
    const match = /^(?:v(?:ariant)?[ _-]*)?(\d+)$/i.exec(stem);
    if (!match) { unknown.push(file); continue; }
    const version = Number(match[1]), row = versions.get(version);
    if (!row) throw new Error(`${file.name}: V${version} does not exist in this product's variants. No images were queued.`);
    if (used.has(row.rowId)) throw new Error(`More than one selected file maps to V${version}. Select one image per variant.`);
    used.add(row.rowId); matched.push({ file, rowId: row.rowId });
  }
  const free = [...rows].filter(row => !used.has(row.rowId)).sort((a,b) => a.version-b.version);
  unknown.sort((a,b) => a.name.localeCompare(b.name,"en",{numeric:true,sensitivity:"base"}));
  unknown.forEach((file,index) => matched.push({ file, rowId: free[index].rowId }));
  return matched.sort((a,b) => rows.find(row => row.rowId===a.rowId)!.version - rows.find(row => row.rowId===b.rowId)!.version);
}
export function validateVariantImageSelection(selections: readonly VariantImageSelection[], rows: readonly VariantImageRow[]) {
  validateProductImageFiles(selections.map(s => s.file), Math.min(50, rows.length));
  const selected = new Set<string>();
  for (const s of selections) { if (!rows.some(row => row.rowId === s.rowId)) throw new Error("A selected variant was removed. Check the assignments before uploading."); if (selected.has(s.rowId)) throw new Error("Two images target the same variant. Give each file a different variant."); selected.add(s.rowId); }
}
export function variantImageProgress(jobs: readonly VariantImageJob[], read: (job: VariantImageJob) => {id:string;phase:string;progress:number;receipt?:{url:string}}|null, rows: readonly VariantImageRow[]) {
  let completed=0,failed=0,total=0;
  for (const expected of jobs) {
    const job=read(expected),row=rows.find(r=>r.rowId===expected.rowId);
    if (!job || job.id!==expected.id || !row) { failed++; continue; }
    const applied=job.phase==="applied" && job.receipt?.url===row.image1;
    if(applied)completed++;if(job.phase==="error")failed++;
    total+=applied?100:Math.min(95,Math.max(0,job.progress));
  }
  return {completed,failed,percent:jobs.length?Math.floor(total/jobs.length):0};
}
