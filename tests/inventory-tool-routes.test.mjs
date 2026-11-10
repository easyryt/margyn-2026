
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL("../lib/inventory-tool-routes.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,URLSearchParams});
const {INVENTORY_SECTIONS,safeInventoryReturn,inventoryReturnPath}=module.exports;
test("inventory login return paths preserve supported pages and model references",()=>{
 const root="/tools/inventory-admin",id="0123456789abcdef01234567";
 for(const section of INVENTORY_SECTIONS.filter(section=>section.path))assert.equal(safeInventoryReturn(root+section.path),true);
 for(const path of [root+"/inventory/low-stock",root+"/inventory/"+id,root+"/barcodes/"+id,root+"/inventory?product="+id])assert.equal(safeInventoryReturn(path),true,path);
 assert.equal(inventoryReturnPath(["inventory"],{product:id}),root+"/inventory?product="+id);
 for(const path of ["https://untrusted.invalid"+root+"/products",root+"/fake",root+"/inventory/not-an-id",root+"/inventory/%2Foutside",root+"/products?next=https://untrusted.invalid",root+"/inventory?product="+id+"&product="+id])assert.equal(safeInventoryReturn(path),false,path);
});
