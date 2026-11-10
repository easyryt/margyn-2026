import type { TestCheckout } from "./ai-plan-types";
export type RazorpayResult = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type Options = { key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  handler: (result: RazorpayResult) => void; modal: { ondismiss: () => void }; theme: { color: string } };
declare global { interface Window { Razorpay?: new (options: Options) => { open: () => void }; } }
let scriptPromise: Promise<void> | null = null;
async function loadCheckout() {
  if (window.Razorpay) return;
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => window.Razorpay ? resolve() : reject(new Error("The test checkout could not be loaded. Try again."));
    script.onerror = () => { script.remove(); reject(new Error("The test checkout could not be loaded. Check your connection and try again.")); };
    document.head.appendChild(script);
  }).catch(error => { scriptPromise = null; throw error; });
  return scriptPromise;
}
export async function openTestCheckout(checkout: TestCheckout, planName: string): Promise<RazorpayResult | null> {
  if (checkout.mode !== "test" || !checkout.keyId.startsWith("rzp_test_")) throw new Error("Only test payments are enabled.");
  await loadCheckout();
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) { reject(new Error("The test checkout is unavailable.")); return; }
    const modal = new window.Razorpay({ key: checkout.keyId, amount: checkout.amount, currency: checkout.currency,
      name: "Margyn AI", description: planName + " · Test payment", order_id: checkout.orderId,
      handler: resolve, modal: { ondismiss: () => resolve(null) }, theme: { color: "#4f46e5" } });
    modal.open();
  });
}
