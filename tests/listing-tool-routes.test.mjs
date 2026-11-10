
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL("../lib/listing-tool-routes.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,URLSearchParams});
const {safeListingReturn,listingReturnPath}=module.exports;
test("listing login destinations keep canonical model/category encoding and edit context",()=>{
 for(const path of ["/tools/listing-tool/products","/tools/listing-tool/products/model/Apple%20iPhone%2013","/tools/listing-tool/general-products/category/Beads%20%26%20Charms","/tools/listing-tool/create-general-product?productId=0123456789abcdef01234567&step=variants"]){assert.equal(safeListingReturn(path),true,path);}
 assert.equal(listingReturnPath(["products","model","Apple iPhone 13"]),"/tools/listing-tool/products/model/Apple%20iPhone%2013");
 for(const path of ["https://untrusted.invalid/tools/listing-tool/products","//untrusted.invalid/tools/listing-tool/products","/tools/listing-tool/fake","/tools/listing-tool/products/model/Apple%2FiPhone","/tools/listing-tool/products?next=https%3A%2F%2Funtrusted.invalid","/tools/listing-tool/products/model/..","/tools/listing-tool/create-general-product?step=variants&step=edit"]){assert.equal(safeListingReturn(path),false,path);}
});
