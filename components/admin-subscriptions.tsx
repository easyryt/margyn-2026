"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { SubscriptionAccount, SubscriptionSettings, AdminPlanPurchase } from "@/lib/subscription-types";
import Dialog from "./dialog";

const format = (value: number) => value.toLocaleString("en-IN");
const MB = 1024 * 1024;
const storage = (bytes: number) => `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(bytes / MB)} MB`;
function localDate(value: number | null) {
  if (value === null) return "";
  const date = new Date(value);
  return new Date(value - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
async function request(path: string, body?: unknown) {
  const response = await fetch("/api/admin/" + path, {
    cache: "no-store",
    ...(body === undefined ? {} : { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not save subscription settings.");
  return data;
}
export default function AdminSubscriptions() {
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [draft, setDraft] = useState<SubscriptionSettings | null>(null);
  const [accounts, setAccounts] = useState<SubscriptionAccount[]>([]);
  const [purchases, setPurchases] = useState<AdminPlanPurchase[]>([]);
  const [paymentsReady, setPaymentsReady] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<SubscriptionAccount | null>(null);
  const [planId, setPlanId] = useState("");
  const [limit, setLimit] = useState(0);
  const [imageLimit, setImageLimit] = useState(0);
  const [storageMB, setStorageMB] = useState(0);
  const [expires, setExpires] = useState("");
  const [status, setStatus] = useState("active");
  const [newPeriod, setNewPeriod] = useState(false);
  const [clearHold, setClearHold] = useState(false);
  const [dialogError, setDialogError] = useState("");
  useEffect(() => {
    let active = true;
    request("subscriptions").then(data => {
      if (active) { setSettings(data.settings); setDraft(data.settings); setAccounts(data.accounts); setPurchases(data.purchases || []); setPaymentsReady(data.payment?.available === true); }
    }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function refresh() {
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await request("subscriptions");
      setAccounts(data.accounts); setSettings(data.settings);
      setPurchases(data.purchases || []); setPaymentsReady(data.payment?.available === true);
      if (!draft) setDraft(data.settings);
      setNotice("Account usage refreshed.");
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  function edit(account: SubscriptionAccount) {
    const subscription = account.subscription;
    setEditing(account);
    setPlanId(settings?.plans.some(plan => plan.id === subscription.planId) ? subscription.planId! : "");
    setLimit(subscription.tokenLimit); setExpires(localDate(subscription.expiresAt));
    setImageLimit(subscription.imageLimit); setStorageMB(subscription.storageLimitBytes / MB);
    setStatus(subscription.status === "expired" ? "active" : subscription.status);
    setNewPeriod(false); setClearHold(false); setDialogError("");
  }
  function choosePlan(id: string) {
    setPlanId(id);
    const plan = settings?.plans.find(item => item.id === id);
    if (plan) { setLimit(plan.tokenLimit); setImageLimit(plan.imageLimit); setStorageMB(plan.storageLimitBytes / MB); setExpires(localDate(Date.now() + plan.durationDays * 86400000)); }
  }
  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setDialogError(""); setNotice("");
    try {
      const data = await request(`users/${encodeURIComponent(editing.id)}/subscription`, {
        planId: planId || null, tokenLimit: limit, expiresAt: expires ? new Date(expires).getTime() : null,
        imageLimit, storageLimitBytes: Math.round(storageMB * MB),
        status, startNewPeriod: newPeriod, clearUsageHold: clearHold, revision: editing.subscription.revision,
      });
      setAccounts(items => items.map(item => item.id === editing.id ? { ...item, subscription: data.subscription } : item));
      setNotice(`Subscription saved for ${editing.name || editing.phone}.`); setEditing(null);
    } catch (error) { setDialogError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const data = await request("subscription-settings", { ...draft, plans: draft!.plans.map(plan => ({ ...plan, offers: plan.offers.map(offer => offer.trim()).filter(Boolean) })) });
      setSettings(data.settings); setDraft(data.settings);
      setNotice("Plans and starting allowance saved. Visible plans are now shown on the user AI plans page.");
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  const shown = accounts.filter(account => `${account.phone} ${account.name} ${account.subscription.planName}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="subscription-admin">
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success-notice" role="status">{notice}</p>}
    {loading ? <p role="status">Loading subscriptions…</p> : !settings || !draft ? <button className="button button-outline" onClick={refresh} disabled={busy}>Try again</button> : <>
      <div className="stat-grid subscription-stats">
        <article className="stat-card"><span>Accounts</span><strong>{format(accounts.length)}</strong><p>Manage each user’s AI allowance</p></article>
        <article className="stat-card"><span>Active subscriptions</span><strong>{format(accounts.filter(account => account.subscription.status === "active").length)}</strong><p>Including starting allowances</p></article>
        <article className="stat-card"><span>Tokens used</span><strong>{format(accounts.reduce((sum, account) => sum + account.subscription.usedTokens, 0))}</strong><p>Across current account periods</p></article>
      </div>
      <section className="admin-table-section">
        <div className="admin-table-title"><div><h2>User allowances</h2><p>Choose a plan or set a user’s AI, image and storage limits.</p></div><button className="text-button" onClick={refresh} disabled={busy}>{busy ? "Refreshing…" : "Refresh accounts"}</button></div>
        <div className="admin-table-controls"><label className="search-field"><input type="search" aria-label="Search subscriptions" placeholder="Search by name, phone or plan…" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
        <div className="table-scroll"><table className="subscription-accounts-table"><thead><tr><th>User</th><th>Subscription</th><th>Token usage</th><th>Expires</th><th>Actions</th></tr></thead><tbody>
          {shown.map(account => <tr key={account.id}>
            <td><strong>{account.name || account.phone}</strong>{account.name && <small className="subscription-detail">{account.phone}</small>}<small className="subscription-mobile-plan">{account.subscription.planName}<span className="subscription-capitalize"> · {account.subscription.status}</span>{account.subscription.unreportedCalls > 0 && " · Usage review needed"}</small></td>
            <td><strong>{account.subscription.planName}</strong><small className="subscription-detail subscription-capitalize">{account.subscription.status}{account.subscription.unreportedCalls > 0 ? " · Usage review needed" : ""}</small></td>
            <td><strong>{format(account.subscription.usedTokens)} / {format(account.subscription.tokenLimit)}</strong><small className="subscription-detail">{format(account.subscription.remainingTokens)} tokens remaining</small><small className="subscription-detail">AI images: {format(account.subscription.usedImages)} / {format(account.subscription.imageLimit)}</small><small className="subscription-detail">Storage: {account.subscription.storageSyncedAt ? storage(account.subscription.storageUsedBytes) : "Not synced"} / {storage(account.subscription.storageLimitBytes)}</small></td>
            <td>{account.subscription.expiresAt ? new Date(account.subscription.expiresAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "No expiry"}</td>
            <td><button className="button button-outline button-small" aria-label={`Manage tokens for ${account.phone}`} onClick={() => edit(account)} disabled={busy}>Manage limits</button></td>
          </tr>)}
        </tbody></table>{!shown.length && <div className="empty-state"><h3>No matching accounts</h3><p>Try a different name or phone number.</p></div>}</div>
        <p className="subscription-help">Usage includes actual provider input and output tokens, including images, reviews and retries. A call already running can exceed the remaining allowance; further calls are blocked.</p>
      </section>
      <section className="admin-table-section">
        <div className="admin-table-title"><div><h2>AI plans & pricing</h2><p>Set the price, duration and offers for each plan. Visible plans appear on the user AI plans page.</p></div></div>
        <form className="form-fields subscription-settings-form" onSubmit={saveSettings}>
          <fieldset disabled={busy}>
            <h3>Free account allowances</h3>
            <label>Starting tokens for unassigned accounts<input type="number" min="0" max="1000000000" step="1" required value={draft.defaultTokenLimit} onChange={event => setDraft({ ...draft, defaultTokenLimit: Number(event.target.value) })} /></label>
            <div className="subscription-resource-fields"><label>Free AI images<input type="number" min="0" max="1000000" step="1" required value={draft.defaultImageLimit} onChange={event => setDraft({ ...draft, defaultImageLimit: Number(event.target.value) })} /></label><label>Free storage (MB)<input type="number" min="0" max="1048576" step="any" required value={draft.defaultStorageLimitBytes / MB} onChange={event => setDraft({ ...draft, defaultStorageLimitBytes: Math.round(Number(event.target.value) * MB) })} /></label></div>
            <p className="subscription-help">Applied once when an account’s allowance is first created. Set 0 to require an admin assignment before AI use.</p>
            <p className="subscription-help">Free AI, image and storage defaults apply to new accounts. Existing users keep their allowances; use Manage limits to change them. Image limits count completed AI output images. Storage covers saved image originals; temporary generation inputs and downloads do not use storage.</p>
            <div className="subscription-plan-list">{draft.plans.map((plan, index) => <div className="subscription-plan-row" key={plan.id}>
              <label>Plan name<input required maxLength={60} value={plan.name} onChange={event => setDraft({ ...draft, plans: draft.plans.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></label>
              <label>Price (₹)<input type="number" min="0" max="1000000" step="0.01" placeholder="Not set" value={plan.pricePaise === null ? "" : plan.pricePaise / 100} onChange={event => setDraft({ ...draft, plans: draft.plans.map((item, i) => i === index ? { ...item, pricePaise: event.target.value === "" ? null : Math.round(Number(event.target.value) * 100) } : item) })} /></label>
              <label>Tokens<input type="number" required min="0" max="1000000000" step="1" value={plan.tokenLimit} onChange={event => setDraft({ ...draft, plans: draft.plans.map((item, i) => i === index ? { ...item, tokenLimit: Number(event.target.value) } : item) })} /></label>
              <label>Duration (days)<input type="number" required min="1" max="3650" step="1" value={plan.durationDays} onChange={event => setDraft({ ...draft, plans: draft.plans.map((item, i) => i === index ? { ...item, durationDays: Number(event.target.value) } : item) })} /></label>
              <div className="subscription-resource-fields subscription-plan-resources"><label>AI images per period<input type="number" min="0" max="1000000" step="1" required value={plan.imageLimit} onChange={event => setDraft({ ...draft, plans: draft.plans.map((item, i) => i === index ? { ...item, imageLimit: Number(event.target.value) } : item) })} /></label><label>Plan storage (MB)<input type="number" min="0" max="1048576" step="any" required value={plan.storageLimitBytes / MB} onChange={event => setDraft({ ...draft, plans: draft.plans.map((item, i) => i === index ? { ...item, storageLimitBytes: Math.round(Number(event.target.value) * MB) } : item) })} /></label></div>
              <button type="button" className="text-button" aria-label={`Remove plan ${plan.name || index + 1}`} onClick={() => setDraft({ ...draft, plans: draft.plans.filter((_, i) => i !== index) })}>Remove</button>
              <label className="subscription-plan-offers">Offers included (one per line)<textarea aria-label="Offers included (one per line)" rows={4} maxLength={1800} placeholder={"AI image generation\nAI listing assistance\nPriority support"} value={plan.offers.join("\n")} onChange={event => setDraft({ ...draft, plans: draft.plans.map((item, i) => i === index ? { ...item, offers: event.target.value.split("\n") } : item) })} /><small>Up to 12 offers, 140 characters each. Token counts stay private to administrators.</small></label>
              <label className="checkbox-field subscription-plan-published"><input type="checkbox" checked={plan.published} onChange={event => setDraft({ ...draft, plans: draft.plans.map((item, i) => i === index ? { ...item, published: event.target.checked } : item) })} /><span>Show this plan to users</span></label>
            </div>)}</div>
            <div className="subscription-actions"><button type="button" className="button button-outline" disabled={draft.plans.length >= 20} onClick={() => setDraft({ ...draft, plans: [...draft.plans, { id: crypto.randomUUID(), name: "", tokenLimit: 100000, imageLimit: draft.defaultImageLimit, storageLimitBytes: draft.defaultStorageLimitBytes, durationDays: 30, pricePaise: null, offers: [], published: true }] })}>Add plan</button><button className="button button-green">{busy ? "Saving…" : "Save plans & defaults"}</button></div>
            <p className="subscription-help">Set a price to enable purchase; ₹0 creates a free plan. Existing plans without a price show “Pricing coming soon”. Internal tokens are never shown to users. {paymentsReady ? "Razorpay test checkout is configured. No real money is charged." : "Razorpay test credentials must be configured in the backend before paid checkout is available."}</p>
            <p className="subscription-help">Editing a plan updates its public listing. Existing subscriptions and completed purchases keep their assigned benefits.</p>
          </fieldset>
        </form>
      </section>
      <section className="admin-table-section"><div className="admin-table-title"><div><h2>AI plan purchases</h2><p>Razorpay test payment records. A plan activates only after the backend confirms a captured payment.</p></div></div><div className="table-scroll"><table><thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Payment reference</th></tr></thead><tbody>{purchases.map(purchase => <tr key={purchase.id}><td>{purchase.name || purchase.phone}</td><td>{purchase.plan.name}</td><td>{purchase.plan.pricePaise === null ? "Not set" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(purchase.plan.pricePaise / 100)}</td><td className="subscription-capitalize">{purchase.status === "paid" ? "Paid · activation pending" : purchase.status}</td><td>{purchase.paymentId || "—"}</td></tr>)}</tbody></table>{!purchases.length && <div className="empty-state"><p>No plan purchases yet.</p></div>}</div></section>
    </>}
    {editing && <Dialog title="Manage AI, images & storage" onClose={() => { if (!busy) setEditing(null); }}>
      <p className="subscription-help">{editing.name ? `${editing.name} · ` : ""}{editing.phone}</p>
      <form className="form-fields subscription-account-form" onSubmit={saveAccount}>
        <fieldset disabled={busy}>
          <label>Subscription plan<select value={planId} onChange={event => choosePlan(event.target.value)}><option value="">Custom allowance</option>{settings?.plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · {format(plan.tokenLimit)} tokens / {plan.durationDays} days</option>)}</select></label>
          <button type="button" className="button button-outline button-small" onClick={() => { if (settings) { setPlanId(""); setLimit(settings.defaultTokenLimit); setImageLimit(settings.defaultImageLimit); setStorageMB(settings.defaultStorageLimitBytes / MB); setExpires(""); } }}>Copy free defaults</button>
          <label>Token allowance<input name="tokenLimit" type="number" min="0" max="1000000000" step="1" required value={limit} onChange={event => setLimit(Number(event.target.value))} /></label>
          <div className="subscription-resource-fields"><label>AI image allowance<input name="imageLimit" type="number" min="0" max="1000000" step="1" required value={imageLimit} onChange={event => setImageLimit(Number(event.target.value))} /></label><label>Storage allowance (MB)<input name="storageMB" type="number" min="0" max="1048576" step="any" required value={storageMB} onChange={event => setStorageMB(Number(event.target.value))} /></label></div>
          <p className="subscription-help">{format(editing.subscription.usedImages)} AI images used. Storage: {editing.subscription.storageSyncedAt ? storage(editing.subscription.storageUsedBytes) : "not synced yet"}. Lowering storage never deletes files. New uploads stop at the limit; deleting library images frees space.</p>
          <div className="subscription-presets" aria-label="Quick token amounts">{[10000, 100000, 1000000].map(value => <button type="button" key={value} onClick={() => setLimit(value)}>{format(value)}</button>)}</div>
          <p className="subscription-help">{format(editing.subscription.usedTokens)} used: {format(editing.subscription.inputTokens)} input + {format(editing.subscription.outputTokens)} output. Setting 0 blocks AI use.</p>
          <div className="form-row"><label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="active">Active</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option></select></label><label>Expires at (your local time)<input type="datetime-local" value={expires} onChange={event => setExpires(event.target.value)} /></label></div>
          <p className="subscription-help">Leave expiry empty for no expiry. Renew by choosing a future date and starting a new period.</p>
          <label className="checkbox-field"><input type="checkbox" checked={newPeriod} onChange={event => setNewPeriod(event.target.checked)} /><span>Start a new period and reset AI and image usage to zero</span></label>
          {editing.subscription.unreportedCalls > 0 && <div className="subscription-hold"><p>{editing.subscription.unreportedCalls} provider call(s) have unreported usage. Review the provider dashboard and account for those tokens before clearing the hold.</p><label className="checkbox-field"><input type="checkbox" checked={clearHold} onChange={event => setClearHold(event.target.checked)} /><span>Provider usage reviewed; clear the usage hold</span></label></div>}
          {dialogError && <p className="error" role="alert">{dialogError}</p>}
          <div className="dialog-actions"><button type="button" className="button button-outline" onClick={() => setEditing(null)}>Cancel</button><button className="button button-green">{busy ? "Saving…" : "Save subscription"}</button></div>
        </fieldset>
      </form>
    </Dialog>}
  </div>;
}
