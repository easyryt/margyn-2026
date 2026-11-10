import { spawn } from "node:child_process";
import { startTestBackend } from "../../backend/tests/support/runtime.mjs";
const backend = await startTestBackend();
// Local payment fixtures only. The browser check never contacts the real gateway.
const actualFetch = globalThis.fetch;
const paymentOrders = new Map();
globalThis.fetch = async (input, options) => {
  if (!String(input).startsWith("https://api.razorpay.com/v1/")) return actualFetch(input, options);
  const path = new URL(String(input)).pathname;
  if (path === "/v1/orders" && options?.method === "POST") {
    const body = JSON.parse(options.body);
    const order = { id: "order_e2e" + (paymentOrders.size + 1), amount: body.amount, currency: body.currency };
    paymentOrders.set(order.id, order); return Response.json(order);
  }
  if (path.startsWith("/v1/payments/")) {
    const id = path.split("/").at(-1), order = paymentOrders.get(id.replace(/^pay_/, "order_"));
    return order ? Response.json({ id, order_id: order.id, amount: order.amount, currency: order.currency, status: "captured", captured: true }) : Response.json({}, { status: 404 });
  }
  return Response.json({ items: [] });
};
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: "development",
      BACKEND_URL: backend.url,
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
);
child.on("exit", async (code) => {
  await backend.close();
  process.exit(code || 0);
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
