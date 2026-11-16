
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import sharp from "../../../backend/node_modules/sharp";
const origin="http://127.0.0.1:3100",root="/tools/inventory-admin",api="/api/tools/inventory-admin";
async function login(request:import("@playwright/test").APIRequestContext,phone:string){const challenge=await(await request.post("/api/auth/request-otp",{headers:{Origin:origin},data:{phone}})).json();expect((await request.post("/api/auth/verify-otp",{headers:{Origin:origin},data:{challengeId:challenge.challengeId,code:challenge.developmentCode}})).ok()).toBe(true);}

test("inventory start page shows stock actions and low stock on desktop and mobile", async ({ page, context }) => {
  test.setTimeout(180000);
  await login(context.request, "9876543258");

  const headers = { Origin: origin };
  const categoryResponse = await context.request.post(api + "/categories", {
    headers, data: { name: "Phone cases", metaFields: [{ key: "brand", label: "Brand", type: "string", required: true }] },
  });
  expect(categoryResponse.status()).toBe(201);
  const { category } = await categoryResponse.json();
  const productResponse = await context.request.post(api + "/products", {
    headers, data: { categoryId: category._id, name: "iPhone 16 Clear Case", attributes: { brand: "Apple" } },
  });
  expect(productResponse.status()).toBe(201);
  const { product } = await productResponse.json();
  const stockResponse = await context.request.post(api + "/inventory/raw", {
    headers, data: { productId: product._id, quantity: 2, minThreshold: 10 },
  });
  expect(stockResponse.status()).toBe(201);

  await page.goto(root);
  const actions = page.getByRole("region", { name: "Quick actions" });
  const lowStock = page.getByRole("region", { name: "Low-stock items" });
  await expect(actions.getByRole("link", { name: /^Manage stock/ })).toHaveAttribute("href", root + "/inventory");
  await expect(actions.getByRole("link", { name: /^Scan barcode/ })).toHaveAttribute("href", root + "/scan-barcode");
  await expect(actions.getByRole("link", { name: /^Print jobs/ })).toHaveAttribute("href", root + "/printing-jobs");
  await expect(actions.getByRole("link", { name: /^Receive purchases/ })).toHaveAttribute("href", root + "/purchase-orders");
  await expect(lowStock.getByText("iPhone 16 Clear Case", { exact: true })).toBeVisible();
  await expect(lowStock.getByText("2 in stock", { exact: true })).toBeVisible();
  await expect(lowStock.getByRole("link", { name: /iPhone 16 Clear Case/ })).toHaveAttribute("href", `${root}/inventory/${product._id}`);
  await expect(lowStock.getByRole("link", { name: "View low stock" })).toHaveAttribute("href", root + "/inventory/low-stock");
  await page.screenshot({ path: ".test-data/screenshots/inventory-start-desktop.png", fullPage: true, animations: "disabled" });

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: ".test-data/screenshots/inventory-start-mobile.png", fullPage: true, animations: "disabled" });
  await page.getByRole("combobox", { name: "Inventory section", exact: true }).selectOption("/inventory/low-stock");
  await expect(page).toHaveURL(root + "/inventory/low-stock");
  await expect(page.getByRole("heading", { name: "Low‑Stock Items", exact: true })).toBeVisible();
});

test("inventory workflows use the existing seller shell, save stock, create designs and print exact QR batches",async({page,context})=>{
 test.setTimeout(210000);const errors:string[]=[],requests:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>requests.push(r.url()));
 await context.addInitScript(()=>{window.print=()=>{};window.close=()=>{}});
 const image=await sharp({create:{width:80,height:80,channels:3,background:"#6c7ec5"}}).png().toBuffer();
 await context.route("https://example.com/**",r=>r.fulfill({contentType:"image/png",body:image}));
 await page.route("**/api/tools/inventory-admin/imagekit/list",r=>r.fulfill({json:{images:[]}}));
 await page.route("**/api/tools/inventory-admin/imagekit/upload",r=>r.fulfill({status:201,json:{fileId:"browser-image",name:"design.png",url:"https://example.com/design.png",filePath:"/fixture/design.png"}}));
 for(const path of [root,root+"/categories",root+"/products",root+"/inventory/low-stock",root+"/printing-jobs",root+"/purchase-orders",root+"/imagekit-images",root+"/create-user"]){const r=await context.request.get(path,{maxRedirects:0});expect(r.status()).toBe(307);expect(new URL("http://test"+r.headers().location).searchParams.get("next")).toBe(path)}
 expect((await context.request.get(api+"/products")).status()).toBe(401);
 await login(context.request,"9876543256");await page.goto(root);await expect(page.getByRole("heading",{name:"Inventory Admin",exact:true})).toBeVisible();
 const nav=page.getByRole("navigation",{name:"Inventory sections",exact:true});await expect(nav.getByRole("link")).toHaveCount(4);
 const more=nav.getByRole("combobox",{name:"More inventory tools",exact:true});
 await more.selectOption("/categories");await expect(page.getByRole("heading",{name:"Categories",exact:true})).toBeVisible();await page.getByRole("button",{name:"New category",exact:true}).click();await page.getByPlaceholder("e.g. Mobile Covers, Charms").fill("Mobile Covers");
 const categoryResponse=page.waitForResponse(r=>r.url().endsWith(api+"/categories")&&r.request().method()==="POST");await page.getByRole("button",{name:"Create category",exact:true}).click();const category=(await(await categoryResponse).json()).category;await expect(page.getByRole("cell",{name:"Mobile Covers",exact:true})).toBeVisible();await page.locator(".tools-desktop-sidebar").evaluate(el=>(el as HTMLElement).dataset.persisted="inventory-sidebar");
 await more.selectOption("/products");await expect(page.getByRole("heading",{name:"Products",exact:true})).toBeVisible();await page.getByRole("button",{name:"New product",exact:true}).click();await page.locator("form select").first().selectOption(category._id);await page.getByPlaceholder("e.g. iPhone 16 Cover").fill("Apple iPhone 13");
 const productResponse=page.waitForResponse(r=>r.url().endsWith(api+"/products")&&r.request().method()==="POST");await page.getByRole("button",{name:"Create product",exact:true}).click();const product=(await(await productResponse).json()).product;await expect(page.getByRole("cell",{name:"Apple iPhone 13",exact:true})).toBeVisible();
 await nav.getByRole("link",{name:"Inventory",exact:true}).click();await expect(page.getByRole("heading",{name:"Inventory Admin",exact:true})).toBeVisible();
 const model = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Apple iPhone 13", exact: true }) });
 await expect(model.getByRole("spinbutton")).toHaveCount(0);
 await page.getByRole("searchbox", { name: "Find a model" }).fill("Mobile Covers");
 await model.getByRole("button", { name: "Add stock", exact: true }).click();
 const quantity = model.getByRole("spinbutton", { name: "Raw units to add for Apple iPhone 13" });
 await expect(quantity).toBeFocused();
 await quantity.fill("100");
 await model.getByRole("button", { name: "Add raw stock", exact: true }).click();
 await expect(model.getByRole("status")).toHaveText("100 raw units added.");
 await expect.poll(async()=> (await(await context.request.get(api+"/dashboard/inventory-products")).json())[0].rawQuantity).toBe(100);
 await expect(page.getByText("100",{exact:true}).first()).toBeVisible();
 fs.mkdirSync(".test-data/screenshots",{recursive:true});await page.screenshot({path:".test-data/screenshots/inventory-models-desktop.png",fullPage:true,animations:"disabled"});
 await more.selectOption("/product-designs");await expect(page.getByRole("heading",{name:"1. Select category and product",exact:true})).toBeVisible();await page.locator(".inventory-page-content select").first().selectOption(category._id);await page.getByPlaceholder("Type product name or SKU...").fill("iPhone");await page.getByRole("button",{name:/Apple iPhone 13.*Category/}).click();
 await page.getByLabel("Design name",{exact:true}).fill("Floral Garden");await page.getByLabel("SKU",{exact:true}).fill("IP13-FLORAL");await page.getByLabel("Design code",{exact:true}).fill("FLORAL");await page.locator('input[type="file"]').first().setInputFiles({name:"design.png",mimeType:"image/png",buffer:image});
 await expect(page.getByRole("button",{name:"Create design",exact:true})).toBeEnabled();const designResponse=page.waitForResponse(r=>r.url().endsWith(api+"/product-designs")&&r.request().method()==="POST");await page.getByRole("button",{name:"Create design",exact:true}).click();expect((await designResponse).status()).toBe(201);
 await nav.getByRole("link",{name:"Print jobs",exact:true}).click();await expect(page.getByRole("heading",{name:"Add Stocks",exact:true})).toBeVisible();const form=page.locator(".inventory-page-content form").first();await form.getByRole("button",{name:"Select category",exact:true}).click();await form.getByRole("button",{name:"Mobile Covers",exact:true}).click();await form.getByRole("button",{name:"Select product",exact:true}).click();await form.getByRole("button",{name:/Apple iPhone 13/}).click();await form.getByRole("button",{name:"Select model/design",exact:true}).click();await form.getByRole("button",{name:/Floral Garden/}).click();await form.getByPlaceholder("Enter quantity").fill("10");await form.locator("select").selectOption("COMPLETED");
 const printResponse=page.waitForResponse(r=>r.url().endsWith(api+"/printing-jobs")&&r.request().method()==="POST");await form.getByRole("button",{name:"Add Product to Stock",exact:true}).click();expect((await printResponse).status()).toBe(201);await expect(page.getByRole("button",{name:"Generate Barcode",exact:true})).toBeVisible();await page.getByRole("button",{name:"Generate Barcode",exact:true}).click();await expect(page.getByRole("button",{name:"Generated",exact:true})).toBeVisible();
 const dashboard=await(await context.request.get(api+"/dashboard/inventory-products")).json();expect(dashboard[0].rawQuantity).toBe(90);expect(dashboard[0].printedQuantity).toBe(10);
 const popupEvent=page.waitForEvent("popup");await page.getByRole("button",{name:"Print All",exact:true}).click();const popup=await popupEvent;await popup.waitForLoadState("domcontentloaded");await expect(popup.locator("svg")).toHaveCount(10);
 const labelSvgs = await popup.locator(".qr svg").evaluateAll(elements => elements.slice(0, 2).map(element => new XMLSerializer().serializeToString(element)));
 const labelCode = await popup.locator(".label code").first().innerText();
 const nextLabelCode = await popup.locator(".label code").nth(1).innerText();
 await popup.close();

 // Feed the app's own printed QR label through a simulated camera stream.
 await page.evaluate((labels) => {
   let permissionDenied = true;
   navigator.mediaDevices.getUserMedia = async (constraints) => {
     const settings = constraints?.video as MediaTrackConstraints | undefined;
     if (JSON.stringify(settings?.facingMode) !== JSON.stringify({ ideal: "user" }) || constraints?.audio !== false) {
       throw new Error("Expected the front camera without audio");
     }
     if (permissionDenied) {
       permissionDenied = false;
       throw new DOMException("Camera denied", "NotAllowedError");
     }
     const canvas = document.createElement("canvas");
     canvas.width = 480;
     canvas.height = 360;
     const images = await Promise.all(labels.map(async svg => {
       const image = new Image();
       image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
       await image.decode();
       return image;
     }));
     const context = canvas.getContext("2d")!;
     const stream = canvas.captureStream(12);
     const paint = () => {
       context.fillStyle = "white";
       context.fillRect(0, 0, canvas.width, canvas.height);
       const label = document.documentElement.dataset.inventoryTestNextLabel ? 1 : 0;
       context.drawImage(images[label], 120, 60, 240, 240);
     };
     paint();
     const timer = window.setInterval(() => {
       if (stream.getVideoTracks()[0].readyState === "ended") window.clearInterval(timer);
       else paint();
     }, 85);
     return stream;
   };
 }, labelSvgs);
 await more.selectOption("/scan-barcode");
 const scanner = page.getByRole("region", { name: "Scan barcode", exact: true });
 const startCamera = scanner.getByRole("button", { name: "Start camera" });
 const manualCode = scanner.getByRole("textbox", { name: "Enter barcode manually" });
 await startCamera.click();
 await expect(scanner.getByRole("alert")).toContainText("Camera access was blocked");
 await manualCode.fill("UNKNOWN-BARCODE");
 await scanner.getByRole("button", { name: "Pack item" }).click();
 await expect(scanner.getByText("No product matches this code.", { exact: false })).toBeVisible();

 await startCamera.click();
 const scannedProduct = scanner.getByRole("region", { name: "Scanned product" });
 const printedStock = scannedProduct.locator("dl > div").filter({ hasText: "Printed stock" });
 const totalLabels = scannedProduct.locator("dl > div").filter({ hasText: "Total labels" });
 const availableLabels = scannedProduct.locator("dl > div").filter({ hasText: "Available labels" });
 await expect(scanner.getByText("Packed · 1 printed unit deducted")).toBeVisible();
 await expect(scannedProduct.getByRole("heading", { name: "Apple iPhone 13" })).toBeVisible();
 await expect(scannedProduct.getByText("SKU: IP13-FLORAL")).toBeVisible();
 await expect(printedStock.locator("dd")).toHaveText("9");
 await expect(totalLabels.locator("dd")).toHaveText("10");
 await expect(availableLabels.locator("dd")).toHaveText("9");
 await expect(manualCode).toHaveValue(labelCode);
 await expect(page).toHaveURL(root + "/scan-barcode");

 // An already packed label cannot deduct stock again.
 await scanner.getByRole("button", { name: "Pack item" }).click();
 await expect(scanner.getByText("Already packed", { exact: true })).toBeVisible();
 await expect(printedStock.locator("dd")).toHaveText("9");
 await expect(availableLabels.locator("dd")).toHaveText("9");

 // Opening the raw stock form pauses decoding until the quantity is saved.
 await scannedProduct.getByText("Add raw stock", { exact: true }).click();
 await page.evaluate(() => { document.documentElement.dataset.inventoryTestNextLabel = "true"; });
 await expect(manualCode).toHaveValue(labelCode);
 await scannedProduct.getByRole("spinbutton", { name: "Raw units to add" }).fill("7");
 const restockRequest = page.waitForResponse(response => response.url().endsWith("/inventory/raw") && response.request().method() === "POST");
 await scannedProduct.getByRole("button", { name: "Add units" }).click();
 const restock = await restockRequest;
 expect(restock.status()).toBe(201);
 expect((await restock.json()).inventory.quantity).toBe(97);

 // The next label is read without restarting the camera.
 await expect(manualCode).toHaveValue(nextLabelCode);
 await expect(scanner.getByText("Packed · 1 printed unit deducted")).toBeVisible();
 await expect(printedStock.locator("dd")).toHaveText("8");
 await expect(totalLabels.locator("dd")).toHaveText("10");
 await expect(availableLabels.locator("dd")).toHaveText("8");
 await scanner.getByRole("button", { name: "Stop camera" }).click();
 expect(await scanner.locator("video").evaluate(element => element.srcObject)).toBeNull();
 await page.setViewportSize({ width: 320, height: 844 });
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.setViewportSize({ width: 1440, height: 1000 });
 await nav.getByRole("link",{name:"Purchases",exact:true}).click();await expect(page.getByRole("heading",{name:"Purchase orders",exact:true})).toBeVisible();await page.getByPlaceholder("e.g. Sadar Bazar Vendor").fill("Fixture supplier");await page.locator(".inventory-page-content select").first().selectOption(product._id);await page.getByPlaceholder("e.g. 100",{exact:true}).fill("20");await page.getByRole("button",{name:"Add product",exact:true}).click();await page.getByRole("button",{name:"Create purchase order",exact:true}).click();await expect(page.getByRole("button",{name:"Verify",exact:true})).toBeVisible();await page.getByRole("button",{name:"Verify",exact:true}).click();const verify=page.locator('.fixed').filter({has:page.getByRole("button",{name:"Close verification",exact:true})}).last();await verify.locator('input[type="number"]').fill("18");await verify.getByRole("button",{name:/Verify|Confirm/}).click();await expect.poll(async()=> (await(await context.request.get(api+"/dashboard/inventory-products")).json())[0].rawQuantity).toBe(115);
 await expect(page.locator(".tools-desktop-sidebar")).toHaveAttribute("data-persisted","inventory-sidebar");
 await nav.getByRole("link",{name:"Inventory",exact:true}).click();await page.getByRole("link",{name:"View details",exact:true}).first().click();await expect(page).toHaveURL(new RegExp(root+"/inventory/"+product._id));await expect(page.getByRole("heading",{name:"Apple iPhone 13",exact:true})).toBeVisible();
 await page.goto(root+"/barcodes/"+product._id);await expect(page.getByRole("heading",{name:"Manage Barcodes",exact:true})).toBeVisible();await expect(page.locator(".inventory-page-content")).toContainText("FLORAL");
 for(const path of [root,root+"/categories",root+"/products",root+"/product-designs",root+"/printing-jobs",root+"/purchase-orders",root+"/barcode-report",root+"/imagekit-images",root+"/create-user",root+"/inventory/low-stock",root+"/inventory/"+product._id,root+"/barcodes/"+product._id]){await page.goto(path);await expect(page.locator(".inventory-workspace")).toBeVisible();for(const width of[390,320]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+" width "+width).toBe(true)}await page.setViewportSize({width:1440,height:1000})}
 await page.goto(root);await page.setViewportSize({width:390,height:844});await page.getByLabel("Inventory section",{exact:true}).selectOption("/categories");await expect(page).toHaveURL(root+"/categories");await page.getByLabel("Inventory section",{exact:true}).selectOption("/inventory");await expect(page.getByRole("heading",{name:"Inventory Admin",exact:true})).toBeVisible();await page.screenshot({path:".test-data/screenshots/inventory-models-mobile.png",fullPage:true,animations:"disabled"});await page.getByRole("button",{name:"Open tool menu",exact:true}).click();await expect(page.getByRole("dialog",{name:"Tool menu",exact:true})).toBeVisible();await page.keyboard.press("Escape");
 expect(requests.some(url=>url.includes("onrender.com")||url.includes("upload.imagekit.io"))).toBe(false);expect(errors).toEqual([]);
});
test("inventory deep pages return after OTP login and reject unknown destinations",async({page,context})=>{
 test.setTimeout(90000);await page.goto(root+"/purchase-orders");await expect(page).toHaveURL(/\/login\?next=/);await page.getByLabel("Mobile number",{exact:true}).fill("9876543257");await page.getByRole("button",{name:"Get verification code",exact:true}).click();await expect(page.locator(".development-notice b")).toBeVisible();await page.getByLabel("Verification code",{exact:true}).fill(await page.locator(".development-notice b").innerText());await page.getByRole("button",{name:"Verify & continue",exact:true}).click();await expect(page).toHaveURL(root+"/purchase-orders");await expect(page.getByRole("heading",{name:"Purchase orders",exact:true})).toBeVisible();for(const path of[root+"/fake",root+"/inventory/not-an-id",root+"/barcodes/../outside"]){expect((await context.request.get(path)).status()).toBe(404)}await page.goto("/login?next="+encodeURIComponent(root+"/products?next=https://untrusted.invalid"));await expect(page).toHaveURL(origin+"/");
});
