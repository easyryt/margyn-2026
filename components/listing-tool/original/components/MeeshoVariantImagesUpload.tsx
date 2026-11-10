"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Images, LoaderCircle } from "lucide-react";
import UploadedImagePreview from "./UploadedImagePreview";
import { canApplyMeeshoReceipt } from "@/components/listing-tool/original/lib/meesho-upload-contract";
import { arrangeVariantMainImages, validateVariantImageSelection, variantImageProgress, type VariantImageJob, type VariantImageRow, type VariantImageSelection } from "@/components/listing-tool/original/lib/meesho-variant-images";
import { checkMeeshoExtension, getMeeshoUpload, getMeeshoUploadRevision, markMeeshoApplied, resumeMeeshoUpload, startMeeshoImageBatch, subscribeMeesho } from "@/components/listing-tool/original/lib/meesho-upload-client";

function SelectedVariantPreview({ file }: {file:File}) {
  const attach=useCallback((node:HTMLDivElement|null)=>{if(!node)return;const url=URL.createObjectURL(file);node.style.backgroundImage=`url("${url}")`;return()=>URL.revokeObjectURL(url);},[file]);
  return <div ref={attach} role="img" aria-label={`Selected variant image ${file.name}`} className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-white bg-contain bg-center bg-no-repeat" />;
}
export default function MeeshoVariantImagesUpload({productId,variants,onChange,disabled=false,saveHint="Save the product batch when ready to store these edits in the database. Supporting images and the parent are unchanged."}: {
  productId:string; variants:VariantImageRow[]; onChange:(rowId:string,url:string)=>void; disabled?:boolean; saveHint?:string;
}) {
  const revision=useSyncExternalStore(subscribeMeesho,getMeeshoUploadRevision,()=>0);
  const [selection,setSelection]=useState<{productId:string;images:VariantImageSelection[]}|null>(null);
  const [batch,setBatch]=useState<{productId:string;jobs:VariantImageJob[]}|null>(null);
  const [error,setError]=useState(""),[starting,setStarting]=useState(false);
  const picker=useRef<HTMLInputElement>(null),applying=useRef(new Set<string>());
  const images=selection?.productId===productId?selection.images:[];
  const jobs=batch?.productId===productId?batch.jobs:[];
  const read=(entry:VariantImageJob)=>getMeeshoUpload({rowId:entry.rowId,field:"image1"});
  const summary=variantImageProgress(jobs,read,variants);
  const active=starting||jobs.some(expected=>{const job=read(expected);return job?.id===expected.id&&["queued","running"].includes(job.phase);});
  const untouched=variants.filter(row=>!images.some(image=>image.rowId===row.rowId));
  useEffect(()=>{
    if(!batch||batch.productId!==productId||disabled)return;
    for(const expected of batch.jobs){
      const row=variants.find(v=>v.rowId===expected.rowId),target={rowId:expected.rowId,field:"image1" as const},job=getMeeshoUpload(target);
      if(!row||job?.id!==expected.id||job.phase!=="ready"||!job.receipt)continue;
      if((job.superseded&&row.image1!==job.receipt.url)||!canApplyMeeshoReceipt(job.receipt,job,row.image1,job.initialValue))continue;
      if(row.image1===job.receipt.url)markMeeshoApplied(target,job.id);
      else if(!applying.current.has(job.id)){applying.current.add(job.id);onChange(row.rowId,job.receipt.url);}
    }
  },[batch,productId,variants,onChange,disabled,revision]);
  const choose=(files:File[])=>{try{setSelection({productId,images:arrangeVariantMainImages(files,variants)});setBatch(null);setError("");applying.current.clear();}catch(e){setError(e instanceof Error?e.message:"Choose the variant images.");}};
  const upload=async()=>{
    if(disabled||active)return;setStarting(true);setError("");
    try{
      validateVariantImageSelection(images,variants);await checkMeeshoExtension(true);
      const ticket=startMeeshoImageBatch(images.map(image=>({file:image.file,target:{rowId:image.rowId,field:"image1"},initialValue:variants.find(v=>v.rowId===image.rowId)!.image1})));
      setBatch({productId,jobs:ticket.jobs.map(job=>({id:job.id,rowId:job.target.rowId,version:variants.find(v=>v.rowId===job.target.rowId)!.version,name:job.name}))});
      void ticket.finished.catch(e=>setError(e instanceof Error?e.message:"Check the individual variant results."));
    }catch(e){setError(e instanceof Error?e.message:"Could not queue variant images.");}finally{setStarting(false);}
  };
  if(!variants.length)return null;
  return <section data-meesho-variant-batch={productId} className="my-4 min-w-0 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Images size={17} />Bulk variant main images</h3><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">Match filenames to the variant number, for example {variants[0]?.version}.png → V{variants[0]?.version}. Only each selected variant’s main image changes. Parent and supporting images stay as they are.</p><p className="mt-1 text-xs font-semibold text-violet-700">Available variants: {variants.slice(0,12).map(row=>`V${row.version}`).join(", ")}{variants.length>12?` +${variants.length-12} more`:""}</p></div><button type="button" disabled={disabled||active} onClick={()=>picker.current?.click()} aria-label={`Choose variant main images for ${productId}`} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">{jobs.length?"Choose another variant image batch":"Choose variant images"}</button><input ref={picker} type="file" multiple accept="image/png,image/jpeg" className="hidden" aria-label={`Select bulk variant main images ${productId}`} onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value="";if(files.length)choose(files);}} /></div>
    {!!images.length&&<>
      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">{images.length} main image{images.length===1?"":"s"} selected. Images 2–4 are preserved for every variant.{untouched.length>0&&<> Unselected variants stay unchanged: {untouched.slice(0,8).map(row=>`V${row.version}`).join(", ")}{untouched.length>8?` +${untouched.length-8} more`:""}.</>}</p>
      <div className="mt-3 max-h-[480px] overflow-auto rounded-xl border border-slate-200 bg-white">
        <table aria-label="Variant main image assignments" className="w-full min-w-[620px] text-xs"><thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-600"><tr><th className="p-3">Selected image</th><th className="p-3">Target variant</th><th className="p-3">Image slot</th><th className="p-3">Status</th></tr></thead><tbody>
          {images.map((image,index)=>{const row=variants.find(v=>v.rowId===image.rowId),expected=jobs.find(j=>j.rowId===image.rowId),job=expected?read(expected):null,matches=!!expected&&job?.id===expected.id,linked=matches&&job.phase==="applied"&&job.receipt?.url===row?.image1;
            const conflict=matches&&!!job.receipt&&!!row&&((job.superseded&&row.image1!==job.receipt.url)||!canApplyMeeshoReceipt(job.receipt,job,row.image1,job.initialValue));
            return <tr key={`${image.file.name}-${index}`} className="border-t border-slate-100"><td className="p-3"><div className="flex items-center gap-3"><SelectedVariantPreview file={image.file}/><span className="max-w-48 break-all font-semibold text-slate-700">{image.file.name}</span></div></td><td className="p-3"><select aria-label={`Assign ${image.file.name} to variant`} value={image.rowId} disabled={disabled||active||!!jobs.length} onChange={e=>setSelection(current=>current?.productId===productId?{...current,images:current.images.map((value,i)=>i===index?{...value,rowId:e.target.value}:value)}:current)} className="rounded-lg border border-slate-200 bg-white p-2 font-semibold text-violet-700 disabled:bg-slate-50"><option value="">Choose variant</option>{variants.map(v=><option key={v.rowId} value={v.rowId}>V{v.version}</option>)}</select><p className="mt-1 max-w-52 truncate text-[10px] text-slate-400" title={row?.title}>{row?.title}</p></td><td className="p-3 font-semibold text-slate-600">Main image only<p className="mt-1 text-[10px] font-normal text-slate-400">Supporting images unchanged</p></td><td className="min-w-52 p-3">{matches?<><div role="progressbar" aria-label={`Variant V${row?.version} main image progress`} aria-valuenow={linked?100:Math.min(job.progress,95)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div style={{width:`${linked?100:Math.min(job.progress,95)}%`}} className={linked?"h-full bg-emerald-500":"h-full bg-violet-500"}/></div><p role="status" className={`mt-2 text-[11px] leading-4 ${linked?"text-emerald-700":conflict||job.phase==="error"?"text-rose-600":"text-slate-500"}`}>{linked?"✓ 100% · Main image linked":conflict?"Newer main-image edit preserved.":job.message}</p>{job.phase==="error"&&job.canResume&&<button type="button" disabled={disabled||active} onClick={()=>void resumeMeeshoUpload({rowId:image.rowId,field:"image1"})} className="mt-2 font-semibold text-violet-700">Check saved upload</button>}{job.receipt&&<UploadedImagePreview url={job.receipt.url} name={image.file.name} className="mt-2" />}{conflict&&job.receipt&&<button type="button" disabled={disabled} onClick={()=>onChange(image.rowId,job.receipt!.url)} className="ml-2 font-semibold text-violet-700">Use this uploaded image</button>}</>:<span className="text-slate-400">Ready after you confirm</span>}</td></tr>;
          })}
        </tbody></table>
      </div>
      {!jobs.length&&<div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Check the assignments first. Up to 50 PNG/JPG images, 4 MB each. Uploads reuse one Meesho tab.</p><button type="button" disabled={disabled||active} onClick={()=>void upload()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{starting&&<LoaderCircle size={14} className="animate-spin"/>}Upload {images.length} variant main images</button></div>}
    </>}
    {!!jobs.length&&<div className="mt-3 rounded-xl bg-white p-3"><div className="flex items-center justify-between text-xs font-semibold text-slate-700"><span className="flex items-center gap-2">{summary.completed===jobs.length?<Check size={14} className="text-emerald-600"/>:active?<LoaderCircle size={14} className="animate-spin"/>:null}{summary.completed} of {jobs.length} variant main images linked</span><span>{summary.percent}%</span></div><div role="progressbar" aria-label="Bulk variant main image progress" aria-valuenow={summary.percent} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div style={{width:`${summary.percent}%`}} className={`h-full transition-[width] ${summary.completed===jobs.length?"bg-emerald-500":"bg-violet-500"}`}/></div><p className="mt-2 text-[11px] text-slate-500">{saveHint}</p></div>}
    {error&&<p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
  </section>;
}
