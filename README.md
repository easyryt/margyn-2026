# Margyn frontend

The applications are separate sibling projects:

```text
margyn/
  backend/          Node.js + Express + MongoDB API — port 4000
  admin-panel/      Existing separate admin-panel project
  margyn-2026/      This Next.js frontend — port 3000
```

The backend is located at `C:\Users\sachi\OneDrive\Desktop\easyryt-github\margyn\backend`. It has its own `package.json`, `node_modules`, `.env`, source, scripts and tests. There is no backend folder inside this frontend.

## Start the backend in its own terminal

```powershell
cd C:\Users\sachi\OneDrive\Desktop\easyryt-github\margyn\backend
npm install
npm run dev
```

The API runs at http://127.0.0.1:4000. Health check: http://127.0.0.1:4000/api/health.

## Start the frontend in another terminal

```powershell
cd C:\Users\sachi\OneDrive\Desktop\easyryt-github\margyn\margyn-2026
npm install
npm run dev
```

Open http://localhost:3000. This command starts only the frontend. The backend must already be running in its own process.

The dev and build scripts use Webpack with Tailwind's PostCSS plugin. This also supports Next.js's WASM compiler fallback when Windows Application Control blocks the native SWC binding.

## Environment

Frontend `.env.local` contains only:

```text
BACKEND_URL=http://127.0.0.1:4000
```

MongoDB, ImageKit, OTP, shipping and API settings are in the sibling backend’s `.env`. Both environment files remain private and ignored by their project configurations. On a fresh setup, copy the corresponding `.env.example` files and supply the server credentials.

The frontend accesses Express over HTTP. Browser `/api/*` requests are proxied to `BACKEND_URL`, and server-rendered pages use that API directly. The backend’s `FRONTEND_ORIGIN` must match the frontend URL, including the port. Restart the affected application after changing its environment.

## Included features

- Margyn catalog, search, filters and wholesale product details.
- Phone OTP login and logout.
- Persistent carts, saved items and coupons.
- Shipping details, unpaid order requests and order history.
- Product, image, stock, customer, coupon and order controls at `/admin`.

Account permissions, existing sessions, product IDs, prices, inventory and orders are preserved. The `admin-panel` sibling folder was not changed by this relocation.

Administrator setup and backend checks are run from the backend terminal:

```powershell
npm run admin:grant -- +919876543210
npm test
npm run services:check
```

Replace the example phone number with your own. See the [backend setup guide](../backend/README.md).

## Frontend verification and production

```powershell
npm run test:e2e
npm run build
npm start
```

Browser checks use an isolated test backend from the sibling project and a local MongoDB replica set; they do not modify the live Atlas catalog. Install the backend’s development dependencies before running these optional end-to-end checks. Screenshots remain ignored under `.test-data/`.

`npm start` runs only the built frontend. Start the backend separately with `npm start` from its own folder. Production requires HTTPS and server-side `NODE_ENV=production`; live SMS requires Twilio Verify credentials. Payments remain unconnected and shipping uses configured flat rates.

## Category browsing

`/categories` lists all published packaging. `/categories/:slug` opens a category from the live catalog, such as `/categories/courier-bags`. The category navigation and filter options are derived from products returned by the Express API. Price, size, specification, pack size, vendor, stock and verified-vendor filters are reflected in the URL and survive reloads. Prices filter and sort by the lowest listed wholesale tier. Customers can compare two to four products and use the existing cart and checkout actions. Mobile filters open in a dialog. The promotional banner has a new image-first layout and retains its existing admin settings.

## Customer profile

`/profile` requires OTP sign-in and lets the account holder save a name and manage a private address book. Customers can add, edit, remove and choose a default address; saved addresses are offered at checkout. Profile and address data persist through the standalone Express API in MongoDB. The storefront navigation uses a profile icon instead of the account phone number. The top announcement has no visible pause control and still supports hover/focus pause and reduced motion.

## Address helpers

Profile and checkout use a state/union territory dropdown and city suggestions from the separate Express backend. The free, offline `@countrystatecity/countries` dataset is installed only in `../backend`; the browser receives India state names and the chosen state's city names, without a global geography bundle or a third-party API key. City/town entry remains free text for places missing from the suggestions. The form includes dataset attribution. See the backend README for the data source and ODbL license.

## Seller tool workspaces

`/tools` is the signed-in seller dashboard. The four internal pages are `/tools/image-generator`, `/tools/listing-tool`, `/tools/inventory-admin`, and `/tools/shipping-labels`. Each page verifies the existing Express/MongoDB session on the server before rendering; guests return to their selected workspace after OTP login. Login return destinations are restricted to known routes, including validated listing model/category paths and edit parameters. Shipping Labels, Image Generator and Listing Tool are integrated. Inventory Admin is integrated.

## Integrated seller dashboard and shipping labels

The `/tools` layout now provides one persistent sidebar, a top bar, and a scrolling content outlet for all four tool routes. Mobile navigation uses a keyboard-accessible drawer. Shipping Labels is functional at `/tools/shipping-labels`: upload PDF, view order/product/page counts, download the sorted ZIP and summary PDF, and reset for another file. Its processing helpers are reused in the separate Express backend; Image Generator, Listing Tool and Inventory Admin are also integrated. All pages and processing endpoints require login.

The shipping-label API is proxied under `/api/tools/shipping-labels`. The frontend proxy allows multipart overhead above the original 1 GB file limit and a six-minute timeout, while the backend enforces the actual file limit and five-minute processing deadline. Processing uses the original SKU grouping and output layouts. No API key is required.

## Image Generator studio

The existing Image Generator dashboard entry now opens the supplied studio inside Margyn, with five internal sections: phone covers, cover & charm, charm packs, backgrounds, and image enhancer. All five pages and all provider/generation API endpoints require login. Nested studio links return to the selected section after OTP login. The main sidebar remains selected on Image Generator throughout.

Source generation prompts, provider/quality defaults, phone-model options, template locking, draft reviews, per-view retries and quantity-tag logic are retained. Browser modules live under `components/image-generator` and `lib/image-generator`; styles are scoped to the studio and use Margyn colors. Original reference PNG/JPEG assets are included unchanged. The separate Express backend owns all AI credentials and generation handlers under `/api/tools/image-generator`. Background composition, enhancement, quantity tags and ZIP downloads run locally in the browser.

The original source project remains separate. Its 94 local/mocked regression tests were adapted to the backend modules; additional HTTP and browser checks cover authentication, multipart transport, selected-view generation, local exports and mobile navigation. No live paid AI calls are required for those checks.


## Listing Tool integration

Open `/tools/listing-tool` from the seller sidebar. The workspace includes the original analytics, phone-cover builder and model catalogs, charm manager and batch builder, general-product builder/category catalogs/details, spreadsheet imports, Excel exports, and browser-assisted image uploads. All listing routes require Margyn login. The existing sidebar persists across sections, with scoped white/indigo controls and a mobile layout. Image Generator, Listing Tool and Shipping Labels are available; Inventory Admin is integrated.

Imported components and calculation helpers live under `components/listing-tool/original`. Thin Link/router wrappers keep their navigation inside the seller workspace, and requests use `/api/tools/listing-tool` on the separate Express backend. Original source folders outside Margyn are unchanged. Source processing bodies are checked against a 96-file snapshot; templates and the extension download are copied byte-for-byte. Listing and inventory use the backend’s configured `MONGODB_URI` and `MONGODB_DB`, with account-specific collections. New workspaces start empty; standalone records and legacy collections are not imported.

Run `npm run test:listing` for calculations, pricing, brand defaults, workbook/export, review, upload contracts and API retry checks; run `npx playwright test tests/browser/listing-tool.spec.ts` for login, navigation, editing, real Excel downloads and mobile checks. The upstream source has stale Fibio expectations (FIBIO vs its current FBO implementation) and an incomplete editor-render mock; only the copied regression harness was adjusted to verify the original implementation. Production calculations retain FBO. ExcelJS remains 4.4.0, with its UUID dependency patched to the compatible CommonJS v11 API used by its v4 helper. AI requests in tests are mocked; no live generation or Meesho actions are performed.


## AI plans and test purchases

Customers open **AI plans** from the workspace sidebar at `/tools/subscription`. The page lists admin-published plans with prices, validity and included offers. Customers see AI availability and their current plan, without token counts. Existing plans without prices show **Pricing coming soon**; set a price in the separate `admin-panel` app on port 3001 to enable checkout. Its plan editor includes an offer per line and a **Show this plan to users** switch. The in-store `/admin` route remains available for compatibility.

**Buy plan** opens Razorpay test checkout. This integration accepts only test keys, charges no real money, and activates access only after the backend verifies a captured payment. Credentials stay in `backend/.env`. Plans are one-time purchases with no automatic renewal. A new purchase starts a new validity period and replaces the current AI plan. **Continue payment**, **Check payment** and **Activate AI** recover interrupted checkouts and pending activation without purchasing twice. A zero-price plan can be claimed once per validity period.

Admin-only usage controls still enforce actual provider input/output limits across Image Generator and Listing Tool, including reviews and retries. Public subscription, plan and purchase responses omit those internal values. Price, offers and usage allowance are snapshotted at purchase; changing a catalog plan preserves existing purchases. See `../backend/README.md` for payment verification, webhook and storage details.

Run `npx playwright test tests/browser/subscriptions.spec.ts` to check user plan visibility, offers, hidden internal usage, verified test checkout, persistence, admin assignment and mobile layouts. Payment calls and the checkout widget are mocked against temporary test data; no real payment or AI call is made.

## Inventory Admin integration

Open `/tools/inventory-admin` from the seller sidebar. All four tools are now available. Inventory Admin includes the original category/product editors, design uploads and gallery, RAW and PRINTED stock, low-stock PDF reports, purchase orders and receipt verification, printing jobs, exact QR/barcode batches, packed-item reports and inventory-local staff creation. The existing Margyn sidebar stays in place, with white/indigo controls and an inventory section selector on mobile.

The imported screens are in `components/inventory-admin/original`. Thin navigation and server-fetch adapters keep their existing processing logic while routing requests through the separate Express backend at `/api/tools/inventory-admin`. Original Next proxy query conventions are retained there. Margyn sessions stay in HttpOnly cookies; legacy token props receive a public session flag rather than a real token. Image uploads also use that backend, with private keys kept off the frontend and media scoped to the signed-in account.

The source frontend and matching Desktop inventory backend are untouched. Source-body parity is checked for 61 imported files. No standalone stock, images or staff credentials are automatically migrated. Each Margyn account owns a separate inventory workspace; inventory staff records do not create Margyn OTP accounts.

Validation: `npm run test:inventory` checks safe login destinations; `npx playwright test tests/browser/inventory-admin.spec.ts` checks actual category/product/design/stock workflows, exact QR print previews, purchase verification, nested routes and mobile layouts against an isolated backend. Backend source regressions and integration checks run separately with `node --test tests/inventory-admin*.test.mjs` from the backend folder. ImageKit uploads in tests are mocked, and no WhatsApp messages or real printer jobs are sent.

## Workspace marketplace

`/tools/marketplace` brings the published, admin-managed product catalog into the seller dashboard. It shares the existing product, cart and checkout APIs. Desktop screens display four products per row, with responsive tablet and phone layouts. Search covers names, categories, SKUs, descriptions, materials and sizes; filters cover category, price, size, specification, pack size, vendor, stock and verified vendors. Sorting, comparison and URL-persisted filters are supported. The existing public storefront and categories remain accessible to guests. Dashboard visitors return to their selected marketplace filters after OTP login.

Run `npx playwright test tests/browser/workspace-marketplace.spec.ts` to verify login return paths, admin publication, catalog filters, four-column layout, comparison, cart and mobile navigation using the isolated test backend.

AI plan cards include generated-image allowances and storage. The current-plan page shows AI images used/remaining and storage used/available, plus Refresh storage usage to reconcile the image library. Provider token counts remain private. Each output view counts as one image; generated downloads and temporary inputs do not use persistent storage. Library uploads and saved listing images share a backend-enforced quota. Renewing a plan starts a new AI/image period and preserves all stored bytes.
