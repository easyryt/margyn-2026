"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AiPlan, AiPurchase, AiSubscription, CheckoutResponse } from "@/lib/ai-plan-types";
import { openTestCheckout } from "@/lib/razorpay-checkout";
const price = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
const storage = (bytes: number) => bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toLocaleString("en-IN", { maximumFractionDigits: 2 })} GB` : `${(bytes / 1024 ** 2).toLocaleString("en-IN", { maximumFractionDigits: 2 })} MB`;
async function read(path: string, signal?: AbortSignal) {
  const response = await fetch("/api/subscription" + path, { cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load AI plans. Please try again.");
  return data;
}
async function post(path: string, body: unknown = {}) {
  const response = await fetch("/api/subscription" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not complete your plan purchase.");
  return data;
}
export default function SubscriptionUsage({ compact = false }: { compact?: boolean }) {
  const [subscription, setSubscription] = useState<AiSubscription | null>(null);
  const [plans, setPlans] = useState<AiPlan[]>([]);
  const [purchases, setPurchases] = useState<AiPurchase[]>([]);
  const [paymentReady, setPaymentReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pathname = usePathname();
  const load = useCallback(async (signal?: AbortSignal) => {
    const data = await read("", signal);
    if (!signal?.aborted) { setSubscription(data.subscription); setError(""); }
    if (!compact) {
      const [catalog, history] = await Promise.all([read("/plans", signal), read("/purchases", signal)]);
      if (!signal?.aborted) { setPlans(catalog.plans); setPaymentReady(catalog.payment.available); setPurchases(history.purchases); }
    }
  }, [compact]);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { if (!document.hidden) void load(controller.signal).catch(error => { if (!controller.signal.aborted) setError(error.message); }); };
    refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("ai-plan-updated", refresh);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener("focus", refresh); window.removeEventListener("ai-plan-updated", refresh); };
  }, [load, pathname]);
  async function refresh() {
    setBusy(true);
    try { await load(); } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function syncStorage() {
    setBusy(true); setError("");
    try { const data = await post("/storage/refresh"); setSubscription(data.subscription); setNotice("Storage usage updated."); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  function activated(purchase: AiPurchase) {
    setNotice(purchase.status === "active" ? `${purchase.plan.name} is active. Your AI is ready to use.` : "Test payment confirmed. Finish any current AI request, then select Activate AI below. If access needs review, contact your administrator.");
    window.dispatchEvent(new Event("ai-plan-updated"));
  }
  async function pay(plan: AiPlan, purchase?: AiPurchase) {
    setBusy(true); setError(""); setNotice("");
    try {
      const data: CheckoutResponse = purchase
        ? await read(`/purchases/${encodeURIComponent(purchase.id)}/checkout`)
        : await post("/purchases", { planId: plan.id, idempotencyKey: crypto.randomUUID() });
      await load();
      if (!data.checkout) { activated(data.purchase); return; }
      const result = await openTestCheckout(data.checkout, data.purchase.plan.name);
      if (!result) { setNotice("Test checkout closed. You can continue the payment below."); return; }
      const verified = await post("/verify-payment", { purchaseId: data.purchase.id, ...result });
      activated(verified.purchase);
      await load();
    } catch (error) { await load().catch(() => {}); setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function checkPayment(purchase: AiPurchase) {
    setBusy(true); setError(""); setNotice("");
    try { const data = await post(`/purchases/${encodeURIComponent(purchase.id)}/refresh`); activated(data.purchase); await load(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  if (compact) return <Link href="/tools/subscription" className="tools-ai-status" title={error || "Your AI plan"}>{subscription?.canUseAi ? "AI available" : "Explore AI plans"}</Link>;
  if (!subscription) return <div className="subscription-user-card">{error ? <><p className="error" role="alert">{error}</p><button onClick={refresh} disabled={busy} className="button button-outline">Try again</button></> : <p role="status">Loading AI plans…</p>}</div>;
  return <div className="ai-plans-page">
    <div className="ai-plans-heading"><div><p className="eyebrow">MORE POSSIBILITIES WITH AI</p><h1>Choose your AI plan</h1><p>Find the right plan for your creative work and everyday business.</p></div><button className="button button-outline" onClick={refresh} disabled={busy}>{busy ? "Please wait…" : "Refresh plans"}</button></div>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="ai-plan-notice" role="status">{notice}</p>}
    <section className="ai-current-plan" aria-label="Your current AI plan"><div><span>YOUR CURRENT PLAN</span><h2>{subscription.planName}</h2><p>{subscription.canUseAi ? "AI is ready to use" : subscription.requiresReview ? "AI access is awaiting review" : subscription.status === "active" ? "Choose a plan below to continue with AI" : `Your plan is ${subscription.status}`}</p></div><div><span className="ai-plan-status">{subscription.canUseAi ? "AI available" : "AI unavailable"}</span><p>{subscription.expiresAt ? "Valid until " + new Date(subscription.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "Managed by your administrator"}</p></div>{subscription.offers.length > 0 && <ul className="ai-plan-features ai-current-offers">{subscription.offers.map((offer, i) => <li key={i}>{offer}</li>)}</ul>}</section>
    <p className="ai-test-payment-note">Razorpay test checkout · No real money is charged. Plans are one-time purchases and do not renew automatically.</p>
    <section className="ai-resource-usage" aria-label="Your AI image and storage usage"><article><span>AI images</span><strong>{subscription.usedImages.toLocaleString("en-IN")} / {subscription.imageLimit.toLocaleString("en-IN")}</strong><p>{subscription.remainingImages.toLocaleString("en-IN")} remaining this period. Each generated view counts as one image.</p>{!subscription.remainingImages && <p>Your image allowance has been reached. Choose a plan to keep creating.</p>}</article><article><span>Storage</span><strong>{subscription.storageSyncedAt ? storage(subscription.storageUsedBytes) : "Not synced"} / {storage(subscription.storageLimitBytes)}</strong><p>Saved images use storage. Deleting them frees space.</p><button className="button button-outline button-small" disabled={busy} onClick={() => void syncStorage()}>Refresh storage usage</button></article></section>
    <div className="ai-plan-grid" aria-label="Available AI plans">{plans.map(plan => {
      const current = subscription.planId === plan.id && subscription.canUseAi;
      const renew = current && plan.pricePaise !== null && plan.pricePaise > 0 && !subscription.remainingImages && plan.imageLimit > 0;
      const pending = purchases.find(purchase => purchase.plan.id === plan.id && purchase.status === "pending");
      return <article className={"ai-plan-card" + (current ? " is-current" : "")} key={plan.id} aria-label={`${plan.name} plan`}>
        {current && <span className="ai-plan-current-label">Your plan</span>}
        <h2>{plan.name}</h2><div className="ai-plan-price">{plan.pricePaise === null ? <strong>Pricing coming soon</strong> : <strong>{plan.pricePaise === 0 ? "Free" : price(plan.pricePaise)}</strong>}<span>for {plan.durationDays} days</span></div>
        <ul className="ai-plan-features"><li>{plan.imageLimit.toLocaleString("en-IN")} AI images per period</li><li>{storage(plan.storageLimitBytes)} storage</li>{(plan.offers.length ? plan.offers : ["AI tools access"]).map((offer, i) => <li key={i}>{offer}</li>)}</ul>
        <button className="button button-dark" disabled={busy || (current && !renew) || plan.pricePaise === null || (plan.pricePaise > 0 && !paymentReady)} onClick={() => void pay(plan, pending)}>{renew ? "Renew plan" : current ? "Current plan" : pending ? "Continue test payment" : plan.pricePaise === null ? "Coming soon" : plan.pricePaise === 0 ? "Start free plan" : "Buy plan"}</button>
        {plan.pricePaise !== null && plan.pricePaise > 0 && !paymentReady && <small>Test payments are being configured. Please check back soon.</small>}
      </article>;
    })}</div>
    {!plans.length && <div className="subscription-user-card"><h2>AI plans are coming soon</h2><p>Your administrator hasn’t published any plans yet. Check back soon.</p></div>}
    <p className="subscription-help">A new plan starts after payment is confirmed and replaces your current AI plan. AI and image usage start a new period. Saved files continue to use storage. Review the included offers before purchasing.</p>
    {purchases.length > 0 && <section className="ai-purchase-history" aria-label="Your plan purchases"><h2>Your plan purchases</h2>{purchases.map(purchase => <div className="ai-purchase-row" key={purchase.id}><div><strong>{purchase.plan.name}</strong><span>{purchase.plan.pricePaise === 0 ? "Free" : purchase.plan.pricePaise === null ? "" : price(purchase.plan.pricePaise)} · {new Date(purchase.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</span></div><span className="ai-purchase-status">{purchase.status === "active" ? "Plan activated" : purchase.status === "paid" ? "Payment confirmed · activation pending" : purchase.status === "pending" ? "Awaiting test payment" : purchase.status === "failed" ? "Checkout not completed" : "Preparing checkout"}</span><div className="ai-purchase-actions">{purchase.status === "pending" && <button className="button button-outline button-small" disabled={busy} onClick={() => void pay(purchase.plan, purchase)}>Continue payment</button>}{["pending", "paid"].includes(purchase.status) && <button className="button button-outline button-small" disabled={busy} onClick={() => void checkPayment(purchase)}>{purchase.status === "paid" ? "Activate AI" : "Check payment"}</button>}</div></div>)}</section>}
  </div>;
}
