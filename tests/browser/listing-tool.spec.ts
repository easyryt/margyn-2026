
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import ExcelJS from "exceljs";
const origin="http://127.0.0.1:3100",root="/tools/listing-tool",api="/api/tools/listing-tool";
const title="Apple iPhone 13 Back Cover Case with Clear Floral Garden Print";
const generalTitle="Universal Transparent Phone Charms Holder Insert Tabs (Pack of 10)";
async function signIn(request: import("@playwright/test").APIRequestContext,phone:string){
 const challenge=await (await request.post("/api/auth/request-otp",{headers:{Origin:origin},data:{phone}})).json();
 expect((await request.post("/api/auth/verify-otp",{headers:{Origin:origin},data:{challengeId:challenge.challengeId,code:challenge.developmentCode}})).ok()).toBe(true);
}
test("listing tool stays in the seller dashboard and preserves phone and general-product saves and Excel exports",async({page,context})=>{
 test.setTimeout(180000);
 const errors:string[]=[],requests:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>{if(r.resourceType()==="fetch")requests.push(r.url())});
 await page.route("https://example.com/**",r=>r.fulfill({contentType:"image/svg+xml",body:'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect x="24" y="8" width="32" height="64" rx="6" fill="#7383c8"/></svg>'}));
 for(const path of [root,root+"/products",root+"/create-product",root+"/charms/batch",root+"/charms/317.1",root+"/products/model/Apple%20iPhone%2013",root+"/general-products",root+"/general-products/category/Beads%20%26%20Charms",root+"/create-general-product",root+"/import",root+"/analytics"]){const response=await context.request.get(path,{maxRedirects:0});expect(response.status()).toBe(307);expect(new URL("http://test"+response.headers().location).searchParams.get("next")).toBe(path)}
 expect((await context.request.get(api+"/products/dashboard")).status()).toBe(401);
 await signIn(context.request,"9876543246");
 const parent={productName:title,designName:"Floral Garden",designCode:"FLORAL",designNumber:"317",color:"Transparent",printType:"UVV",finish:"WL",sku:"MBRO-MC-AP-IP13-UVV-FLORAL-WL-TRNSPT-317.1.V1",groupId:"1",models:[{model:"Apple iPhone 13"}],price:121,mrp:899,inventory:20,brand:"Mobiro",category:"Mobile Cases & Covers",image1:"https://example.com/cover.png"};
 const saved=await context.request.post(api+"/products/batch",{headers:{Origin:origin},data:{parent,variants:[{...parent,productName:"Apple iPhone 13 Back Cover Case with Elegant Botanical Floral Print",sku:parent.sku.replace("V1","V2")}]}});expect(saved.status()).toBe(201);
 const phone=(await saved.json()).product;
 const general={draft:{id:"browser-general",productName:generalTitle,category:"Beads & Charms",genericName:"Beads & Charms",productType:"Phone Charms Holder",quantity:"10",price:"64",wrongDefectiveReturnsPrice:"63",mrp:"399",gst:"18",weight:"10",inventory:"2000",hsn:"392640",variation:"Free Size",image1:"https://example.com/holder.png",groupId:"1"},codes:{brandCode:"MBRO",categoryCode:"CHM",productCode:"HLDR",colorCode:"GLD"},parentVersion:1,productContext:"Holder tabs",variants:[{id:"browser-v2",version:2,productName:"Clear Phone Charms Holder Insert Tabs for Mobile Cases (Pack of 10)",overrides:{inventory:"8"}}]};
 expect((await context.request.post(api+"/general-products/batch",{headers:{Origin:origin},data:{products:[general]}})).ok()).toBe(true);
 await page.goto(root);await expect(page.getByRole("heading",{name:"Listing Tool",exact:true})).toBeVisible();await expect(page.getByText(title,{exact:true})).toBeVisible();
 await expect(page.getByRole("link",{name:/^New phone cover/})).toHaveAttribute("href",root+"/create-product");
 await expect(page.getByRole("link",{name:/^New general product/})).toHaveAttribute("href",root+"/create-general-product");
 await expect(page.getByRole("link",{name:/^New charm batch/})).toHaveAttribute("href",root+"/charms/batch");
 await expect(page.getByRole("link",{name:new RegExp(generalTitle.replace(/[()]/g,"\\$&"))})).toHaveAttribute("href",/\/general-products\/[a-f0-9]{24}$/);
 await page.locator(".tools-desktop-sidebar").evaluate(el=>(el as HTMLElement).dataset.persisted="listing-sidebar");
 fs.mkdirSync(".test-data/screenshots",{recursive:true});await page.screenshot({path:".test-data/screenshots/listing-overview-desktop.png",fullPage:true,animations:"disabled"});
 await page.getByRole("link",{name:"Import Excel",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Import Excel",exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Choose or drop spreadsheet",exact:true})).toBeVisible();
 await page.getByRole("link",{name:"Start",exact:true}).click();
 await page.getByRole("link",{name:"View analytics",exact:true}).click();
 await expect(page).toHaveURL(root+"/analytics");
 await expect(page.getByRole("heading",{name:"Stock health",exact:true})).toBeVisible();
 const sections=page.getByRole("navigation",{name:"Listing tool sections",exact:true});await sections.getByRole("link",{name:"Phone covers",exact:true}).click();await expect(page).toHaveURL(root+"/products");await expect(page.getByRole("heading",{name:"Model Analytics",exact:true})).toBeVisible();await expect(page.locator(".tools-desktop-sidebar")).toHaveAttribute("data-persisted","listing-sidebar");
 await page.goto(root+"/products/model/Apple%20iPhone%2013");await expect(page.getByRole("heading",{name:"Apple iPhone 13 Catalog",exact:true})).toBeVisible();await page.locator(".tools-desktop-sidebar").evaluate(el=>(el as HTMLElement).dataset.persisted="listing-sidebar");await expect(page.getByText(title,{exact:true}).first()).toBeVisible();
 await page.getByRole("button",{name:"Edit product",exact:true}).first().click();const editor=page.getByRole("dialog",{name:"Edit products",exact:true});await expect(editor).toBeVisible();
 await editor.getByLabel("Inventory for V1",{exact:true}).fill("34");await editor.getByRole("button",{name:"Save all changes",exact:true}).click();await expect.poll(async()=> (await (await context.request.get(api+"/products/"+phone.id)).json()).product.inventory).toBe(34);await editor.getByRole("button",{name:"Close product editor",exact:true}).click();
 const phoneDownload=page.waitForEvent("download");await page.getByRole("button",{name:/Export Excel \(2\)/}).click();const firstDownload=await phoneDownload;await firstDownload.saveAs(".test-data/listing-phone-export.xlsx");const book=new ExcelJS.Workbook();await book.xlsx.readFile((await firstDownload.path())!);expect(book.worksheets.flatMap(sheet=>{const values:string[]=[];sheet.eachRow(row=>row.eachCell(cell=>values.push(String(cell.value))));return values})).toContain(parent.sku);
 await sections.getByRole("link",{name:"General products",exact:true}).click();await expect(page.getByRole("heading",{name:"Category Analytics",exact:true})).toBeVisible();await page.getByRole("link",{name:"Open Beads & Charms catalog",exact:true}).click();await expect(page).toHaveURL(/\/tools\/listing-tool\/general-products\/category\//);await expect(page.getByRole("heading",{name:"Beads & Charms Catalog",exact:true})).toBeVisible();
 expect(await page.getByRole("button",{name:"Export Selected",exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor)).toBe("rgb(64, 84, 189)");await page.screenshot({path:".test-data/screenshots/listing-general-catalog-desktop.png",fullPage:true,animations:"disabled"});await page.getByRole("link",{name:generalTitle,exact:true}).click();await expect(page.getByRole("heading",{name:generalTitle,exact:true,level:1})).toBeVisible();await page.getByRole("button",{name:"Export Excel",exact:true}).click();const download=page.waitForEvent("download");await page.getByRole("button",{name:"Download Excel",exact:true}).click();const file=await download;const generalBook=new ExcelJS.Workbook();await generalBook.xlsx.readFile((await file.path())!);expect(generalBook.worksheets.some(sheet=>JSON.stringify(sheet.model).includes("MBRO-CHM-HLDR-GLD-10PC-V1"))).toBe(true);
 await page.getByRole("link",{name:"Add variants",exact:true}).click();await expect(page).toHaveURL(/\/tools\/listing-tool\/create-general-product\?productId=.*&step=variants/);await expect(page.getByRole("button",{name:"Generate variant titles",exact:true})).toBeVisible();
 await sections.getByRole("link",{name:"Charms",exact:true}).click();await expect(page).toHaveURL(root+"/charms/batch");await expect(page.getByRole("heading",{name:/Charm/i}).first()).toBeVisible();await expect(page.locator(".tools-desktop-sidebar")).toHaveAttribute("data-persisted","listing-sidebar");
 for(const path of [root,root+"/products",root+"/create-product",root+"/general-products",root+"/create-general-product",root+"/charms/batch"]){await page.goto(path);await expect(page.locator(".listing-workspace")).toBeVisible();for(const width of [390,320]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+" at "+width).toBe(true)}await page.setViewportSize({width:1440,height:1000})}
 await page.goto(root);await page.setViewportSize({width:390,height:844});await expect(page.getByRole("heading",{name:"Listing Tool",exact:true})).toBeVisible();await page.screenshot({path:".test-data/screenshots/listing-overview-mobile.png",fullPage:true,animations:"disabled"});await page.getByRole("button",{name:"Open tool menu",exact:true}).click();await expect(page.getByRole("dialog",{name:"Tool menu",exact:true})).toBeVisible();await page.keyboard.press("Escape");
 expect(requests.some(url=>url.includes("onrender.com"))).toBe(false);expect(errors).toEqual([]);
});
test("listing deep links return safely after login and unrecognized paths stay unavailable",async({page,context})=>{
 test.setTimeout(90000);const path=root+"/general-products/category/Beads%20%26%20Charms";await page.goto(path);await expect(page).toHaveURL(/\/login\?next=/);await page.getByLabel("Mobile number",{exact:true}).fill("9876543247");await page.getByRole("button",{name:"Get verification code",exact:true}).click();await expect(page.locator(".development-notice b")).toBeVisible();const code=await page.locator(".development-notice b").innerText();await page.getByLabel("Verification code",{exact:true}).fill(code);await page.getByRole("button",{name:"Verify & continue",exact:true}).click();await expect(page).toHaveURL(path);await expect(page.getByRole("heading",{name:"Beads & Charms Catalog",exact:true})).toBeVisible();
 const edit=root+"/create-general-product?productId=0123456789abcdef01234567&step=variants";await page.goto("/login?next="+encodeURIComponent(edit));await expect(page).toHaveURL(edit);
 for(const path of [root+"/unrecognized",root+"/products/fake/other",root+"/general-products/not-an-id"]){expect((await context.request.get(path)).status()).toBe(404)}
 await page.goto("/login?next="+encodeURIComponent(root+"/products/model/https:%2F%2Funtrusted.invalid"));await expect(page).toHaveURL(origin+"/");
});
