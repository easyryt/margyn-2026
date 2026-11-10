"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Address,
  Cart,
  User,
  SavedAddress,
  IndianState,
} from "@/lib/types";
import { money } from "@/lib/pricing.mjs";
import { OrderSummary } from "./cart-page";
import LoginForm from "./login-form";
import { Icon } from "./icons";
import AddressLocationFields from "./address-location-fields";
export default function Checkout({
  cart,
  user,
  savedAddresses = [],
  states,
}: {
  cart: Cart;
  user: User | null;
  savedAddresses?: SavedAddress[];
  states: IndianState[];
}) {
  const router = useRouter();
  const [address, setAddress] = useState<Address | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [key] = useState(() =>
    typeof window === "undefined" ? "" : crypto.randomUUID(),
  );
  const [savedAddressId, setSavedAddressId] = useState(
    savedAddresses.find((address) => address.isDefault)?.id || "",
  );
  const savedAddress = savedAddresses.find(
    (address) => address.id === savedAddressId,
  );
  const step = !user ? 1 : address ? 3 : 2;
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          idempotencyKey: key || crypto.randomUUID(),
          expectedTotal: cart.total,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not submit your order.");
      window.dispatchEvent(new Event("margyn:cart"));
      router.push(`/orders/${data.order.id}`);
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  function saveAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(
      new FormData(event.currentTarget),
    ) as Address;
    setAddress(values);
    setError("");
  }
  return (
    <main className="commerce checkout-page">
      <div className="shop-container">
        <div className="checkout-top">
          <span>
            <Icon name="shield" size={17} />
            Checkout
          </span>
          <Link href="/cart">Back to cart</Link>
        </div>
        <nav className="checkout-steps" aria-label="Checkout progress">
          {["Cart", "Login", "Shipping", "Review"].map((label, index) => (
            <div
              key={label}
              className={
                index === step ? "current" : index < step ? "complete" : ""
              }
            >
              <span>{index < step ? "✓" : index + 1}</span>
              {label}
            </div>
          ))}
        </nav>
        {!cart.checkoutReady ? (
          <div className="empty-cart">
            <Icon name="box" size={45} />
            <h1>Review your cart first.</h1>
            <p>
              Add an available product or update your quantities before checking
              out.
            </p>
            <Link href="/cart" className="button button-green">
              Back to cart
            </Link>
          </div>
        ) : (
          <div className="checkout-layout">
            <section className="checkout-content">
              {!user ? (
                <div className="checkout-login">
                  <LoginForm next="/checkout" />
                </div>
              ) : !address ? (
                <>
                  <div className="checkout-section-heading">
                    <span className="stock-label">
                      ✓ Signed in as {user.phone}
                    </span>
                    <h1>Where should we send it?</h1>
                    <p>Enter your shipping details to review your order.</p>
                  </div>
                  {!!savedAddresses.length && (
                    <div className="checkout-saved-addresses">
                      <div>
                        <label htmlFor="saved-shipping-address">
                          Use a saved address
                        </label>
                        <Link href="/profile">Manage addresses</Link>
                      </div>
                      <select
                        id="saved-shipping-address"
                        aria-label="Use a saved address"
                        value={savedAddressId}
                        onChange={(event) =>
                          setSavedAddressId(event.target.value)
                        }
                      >
                        <option value="">Use a different address</option>
                        {savedAddresses.map((address) => (
                          <option value={address.id} key={address.id}>
                            {address.label}
                            {address.isDefault ? " (default)" : ""} —{" "}
                            {address.line1}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <form
                    key={savedAddressId || "new"}
                    className="address-form form-fields"
                    onSubmit={saveAddress}
                  >
                    <div className="form-row">
                      <label>
                        Full name
                        <input
                          name="name"
                          defaultValue={savedAddress?.name || user.name || ""}
                          required
                          minLength={2}
                          maxLength={100}
                          autoComplete="name"
                        />
                      </label>
                      <label>
                        Mobile number
                        <input
                          name="phone"
                          type="tel"
                          required
                          defaultValue={savedAddress?.phone || user.phone}
                          pattern="(\+91)?[6-9][0-9]{9}"
                          autoComplete="tel"
                        />
                      </label>
                    </div>
                    <label>
                      Street address
                      <input
                        name="line1"
                        defaultValue={savedAddress?.line1 || ""}
                        required
                        minLength={5}
                        maxLength={200}
                        autoComplete="address-line1"
                        placeholder="House / office number and street"
                      />
                    </label>
                    <label>
                      Apartment, landmark (optional)
                      <input
                        name="line2"
                        defaultValue={savedAddress?.line2 || ""}
                        maxLength={150}
                        autoComplete="address-line2"
                      />
                    </label>
                    <AddressLocationFields
                      states={states}
                      initialAddress={savedAddress || {}}
                    />
                    <label>
                      GSTIN (optional)
                      <input
                        name="gstin"
                        defaultValue={savedAddress?.gstin || ""}
                        maxLength={15}
                        placeholder="Business GST identification number"
                      />
                    </label>
                    <p className="checkout-delivery-note">
                      Standard delivery within India. The store will confirm
                      delivery availability.
                    </p>
                    <button className="button button-green" type="submit">
                      Continue to review <Icon name="arrow" size={18} />
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="checkout-section-heading">
                    <p className="eyebrow">ONE LAST LOOK</p>
                    <h1>Ready for your next dispatch?</h1>
                    <p>Review your details and submit your order request.</p>
                  </div>
                  <div className="shipping-review">
                    <div>
                      <h2>Shipping address</h2>
                      <button
                        className="text-button"
                        onClick={() => setAddress(null)}
                      >
                        Edit address
                      </button>
                    </div>
                    <strong>{address.name}</strong>
                    <p>
                      {address.line1}
                      {address.line2 && `, ${address.line2}`}
                      <br />
                      {address.city}, {address.state} – {address.pincode}
                      <br />
                      {address.phone}
                      {address.gstin && (
                        <>
                          <br />
                          GSTIN: {address.gstin}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="checkout-order-items">
                    {cart.items
                      .filter((item) => !item.saved)
                      .map((item) => (
                        <div key={item.id}>
                          <img src={item.image} alt="" />
                          <div>
                            <strong>{item.name}</strong>
                            <p>
                              Size {item.size} · {item.quantity} CTN ·{" "}
                              {item.packSize * item.quantity} pieces
                            </p>
                          </div>
                          <b>{money(item.subtotal)}</b>
                        </div>
                      ))}
                  </div>
                  <div className="payment-pending">
                    <Icon name="shield" size={22} />
                    <div>
                      <strong>Order request · payment to be arranged</strong>
                      <p>
                        Online payment is not available yet. The store will
                        confirm your request and contact you to arrange payment.
                      </p>
                    </div>
                  </div>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="checkout-submit-total">
                    <span>Total payable</span>
                    <strong>{money(cart.total)}</strong>
                  </div>
                  <button
                    className="button button-green submit-order"
                    disabled={busy}
                    onClick={submit}
                  >
                    {busy ? "Saving your request…" : "Submit order request"}
                    <Icon name="arrow" size={18} />
                  </button>
                </>
              )}
            </section>
            <aside>
              <OrderSummary cart={cart} />
              <div className="order-box checkout-short-review">
                <h2>Order review</h2>
                {cart.items
                  .filter((item) => !item.saved)
                  .map((item) => (
                    <div key={item.id}>
                      <strong>{item.vendor}</strong>
                      <p>
                        {item.name} × {item.quantity}
                      </p>
                    </div>
                  ))}
                <p className="checkout-note">
                  GST is included in your order total.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
