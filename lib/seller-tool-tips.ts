export const inventoryTips: Record<string, readonly string[]> = {
  "": ["New to inventory? Create a category and product first, then add stock for that model.", "Open a low-stock item to review its quantities and designs."],
  inventory: ["Raw stock is unprinted. Printed stock is tracked by design.", "Enter the number of new units to add. Use View details to see designs and labels."],
  "low-stock": ["Items appear when their stock reaches the minimum quantity you set.", "Use the deficit to see how many units are needed to reach that minimum."],
  "scan-barcode": ["Scan each item as you pack it. Each available label deducts one printed unit.", "Use Add raw stock to enter newly received, unprinted units for the scanned model."],
  "printing-jobs": ["Choose the model and design you’re printing. Completing a job moves units from raw to printed stock."],
  "purchase-orders": ["Create an order for your supplier. When it arrives, verify the quantity you actually received to add it to stock."],
  products: ["Create a category first. Then add each product or phone model under its category."],
  categories: ["Group similar models or products into categories so they’re easier to find."],
  "product-designs": ["Select a category and product before adding a design. Use a design code you can recognize in print jobs."],
  "barcode-report": ["Use this report to review items that have already been packed."],
  "imagekit-images": ["Use the image library to find and reuse product or design photos."],
  "create-user": ["Choose the staff role based on the work they’ll do, such as printing or packing."],
  barcodes: ["Choose the design and quantity before generating labels. Match the labels to their design before printing."],
  detail: ["Open a design to check its stock. Set a minimum quantity to have it appear in the low-stock report when it reaches that level."],
};

export const listingTips: Record<string, readonly string[]> = {
  "": ["Use New phone cover for model-specific cases, or New general product for other items.", "Open a saved product to review it before exporting to Excel."],
  products: ["Choose a phone model to see its saved covers and variants. Select the rows you need before exporting."],
  "create-product": ["Start with the phone model and design. Check the generated SKUs in Preview before saving or exporting."],
  "general-products": ["Choose a category to find saved products. Open one to manage its variants or export it."],
  "create-general-product": ["Add product details before creating variants. Preview the listings before saving or exporting."],
  charms: ["Start with a saved phone cover design and review the charm listings in the batch before exporting."],
  import: ["Choose the spreadsheet with your listings. Check the import results for any rows that need attention."],
  analytics: ["Use model and stock figures to decide which catalog to open or restock first."],
};

export const imageTips = {
  start: ["Choose the tool that matches the result you want. Backgrounds and Image enhancer run on your device without AI credits."],
  covers: ["Use a clear photo of the full cover and choose the iPhone model that matches its camera cutout.", "Select only the views you need. Check the result before downloading; generation and review use credits."],
  charms: ["Upload one photo of the cover and one of the full charm, including its clasp or loop.", "Choose a single view to generate just the image you need."],
  "charm-packs": ["Upload one clear product photo and set the number of pieces you want to show. You can add a quantity tag after generation."],
  backgrounds: ["Upload a PNG with a transparent background, then add the backgrounds you want and export the results."],
  enhance: ["Try small adjustments and compare the preview with the original before downloading the enhanced image."],
};

export const shippingTips = [
  "Use an unlocked PDF with selectable text. The sorter reads SKU and order numbers from the labels.",
  "Download the ZIP for one PDF per SKU and an order summary. You can also download just the summary PDF.",
];
