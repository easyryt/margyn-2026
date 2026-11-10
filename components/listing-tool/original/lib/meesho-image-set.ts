import type { MeeshoImageField } from "./meesho-upload-contract";

export const PRODUCT_IMAGE_SLOTS = ["image1", "image2", "image3", "image4"] as const;
export type ProductImageValues = Record<MeeshoImageField, string>;
export type ProductImageSelection = { field: MeeshoImageField; file: File };
export type ProductImageSetJob = { id: string; field: MeeshoImageField; name: string };

export function validateProductImageFiles(files: readonly Pick<File, "name" | "type" | "size" | "lastModified">[], maximum = 4) {
  if (!files.length || files.length > maximum) throw new Error(maximum === 4 ? "Choose 1 main image and up to 3 supporting images (4 files maximum)." : `Choose between 1 and ${maximum} variant images.`);
  const identities = new Set<string>();
  for (const file of files) {
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size <= 0 || file.size > 4194304) throw new Error(`${file.name}: choose a PNG or JPG up to 4 MB. No images were queued.`);
    const identity = JSON.stringify([file.name.toLowerCase(), file.size, file.lastModified]);
    if (identities.has(identity)) throw new Error(`${file.name} was selected twice. Choose each image once.`);
    identities.add(identity);
  }
}
function filenameSlot(name: string): number | null {
  const stem = name.replace(/\.[^.]+$/, "").trim().toLowerCase();
  if (/^(1|main(?:[ _-]?1)?|primary|front|cover)$/.test(stem)) return 0;
  const support = /^(?:sup|support|supportive|supporting)[ _-]*([1-3])$/.exec(stem);
  if (support) return Number(support[1]);
  const numbered = /^(?:image|img)[ _-]*([1-4])$/.exec(stem);
  return numbered ? Number(numbered[1]) - 1 : null;
}
/** Reserve explicit filename slots first; unknown names fill the remaining slots naturally. */
export function arrangeProductImages<T extends { name: string }>(files: readonly T[]): Array<T | null> {
  if (!files.length || files.length > 4) throw new Error("Select between one and four images for one product.");
  const slots: Array<T | null> = [null, null, null, null], unknown: T[] = [];
  for (const file of files) {
    const index = filenameSlot(file.name);
    if (index === null) unknown.push(file);
    else { if (slots[index]) throw new Error(`Both ${slots[index]!.name} and ${file.name} name Image ${index + 1}. Select one, or rename a file.`); slots[index] = file; }
  }
  unknown.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }));
  for (const file of unknown) slots[slots.indexOf(null)] = file;
  return slots;
}
export function imageSetProgress(jobs: readonly ProductImageSetJob[], read: (job: ProductImageSetJob) => { id: string; progress: number; phase: string; receipt?: { url: string } } | null, values: ProductImageValues) {
  let completed = 0, total = 0, failed = 0;
  for (const expected of jobs) {
    const job = read(expected);
    if (!job || job.id !== expected.id) { failed++; continue; }
    const applied = job.phase === "applied" && job.receipt?.url === values[expected.field];
    if (applied) completed++;
    if (job.phase === "error") failed++;
    total += applied ? 100 : Math.min(95, Math.max(0, job.progress));
  }
  return { completed, failed, percent: jobs.length ? Math.floor(total / jobs.length) : 0 };
}
