import fs from "node:fs";
import path from "node:path";
const secrets = [
  process.env.MONGODB_URI,
  process.env.IMAGEKIT_PRIVATE_KEY,
  process.env.TWILIO_AUTH_TOKEN,
].filter(Boolean);
try {
  const uri = new URL(process.env.MONGODB_URI);
  if (uri.password) secrets.push(decodeURIComponent(uri.password));
} catch {}
if (!secrets.length) {
  console.error("Load the server environment before checking.");
  process.exit(1);
}
const roots = [
  "../backend/src",
  "../backend/scripts",
  "../backend/tests",
  "../backend/package.json",
  "../backend/.env.example",
  "app",
  "components",
  "lib",
  "scripts",
  "tests",
  "public",
  "README.md",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "playwright.config.ts",
  ".env.example",
  ".next/static",
  ".next/dev/static",
  ".next-e2e/static",
  ".next-e2e/dev/static",
];
const matches = [];
let count = 0;
function inspect(file) {
  if (!fs.existsSync(file)) return;
  const stat = fs.statSync(file);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(file)) inspect(path.join(file, child));
    return;
  }
  if (
    !/\.(tsx?|m?js|json|md|css|html|svg|map)$/.test(file) &&
    file !== ".env.example"
  )
    return;
  const content = fs.readFileSync(file, "utf8");
  count++;
  if (secrets.some((secret) => content.includes(secret))) matches.push(file);
}
for (const root of roots) inspect(root);
if (matches.length) {
  console.error("Credential values found in:", matches.join(", "));
  process.exitCode = 1;
} else
  console.log(
    `Credential scan passed: ${count} source and browser files checked. No secret values were printed.`,
  );
