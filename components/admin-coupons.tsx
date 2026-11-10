"use client";
import { useEffect, useState } from "react";
type Coupon = {
  code: string;
  percent: number;
  active: boolean;
  expiresAt: string;
};
export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/admin/coupons");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setCoupons(d.coupons);
  }
  useEffect(() => {
    void load().catch((error) => setError(error.message));
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const r = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.get("code"),
          percent: Number(form.get("percent")),
          days: Number(form.get("days")),
          active: form.get("active") === "on",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      setNotice("Coupon saved.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-table-section">
      <div className="admin-table-title">
        <div>
          <h2>Checkout coupons</h2>
          <p>
            Create an offer or enter an existing code to update or deactivate
            it.
          </p>
        </div>
      </div>
      <form className="form-fields coupon-admin-form" onSubmit={save}>
        <div className="form-row form-row-three">
          <label>
            Coupon code
            <input
              name="code"
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_-]{3,24}"
            />
          </label>
          <label>
            Discount (%)
            <input name="percent" type="number" min="1" max="90" required />
          </label>
          <label>
            Valid for (days)
            <input
              name="days"
              type="number"
              min="1"
              max="365"
              defaultValue={30}
              required
            />
          </label>
        </div>
        <label className="checkbox-field">
          <input type="checkbox" name="active" defaultChecked />
          <span>Coupon is active</span>
        </label>
        <button className="button button-green" disabled={busy}>
          {busy ? "Saving…" : "Save coupon"}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
      </form>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Status</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.code}>
                <td>{coupon.code}</td>
                <td>{coupon.percent}%</td>
                <td>{coupon.active ? "Active" : "Inactive"}</td>
                <td>
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeZone: "Asia/Kolkata",
                  }).format(new Date(coupon.expiresAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
