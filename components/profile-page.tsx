"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Address, Profile, SavedAddress, IndianState } from "@/lib/types";
import { Icon } from "./icons";
import Dialog from "./dialog";
import AddressLocationFields from "./address-location-fields";

const fields: {
  key: keyof Address;
  label: string;
  required?: boolean;
  min?: number;
  max: number;
  autoComplete?: string;
  type?: string;
  pattern?: string;
  wide?: boolean;
}[] = [
  {
    key: "name",
    label: "Recipient name",
    required: true,
    min: 2,
    max: 100,
    autoComplete: "name",
  },
  {
    key: "phone",
    label: "Delivery phone",
    required: true,
    max: 13,
    autoComplete: "tel",
    type: "tel",
    pattern: "([+]91)?[6-9][0-9]{9}",
  },
  {
    key: "line1",
    label: "Street address",
    required: true,
    min: 5,
    max: 200,
    autoComplete: "address-line1",
    wide: true,
  },
  {
    key: "line2",
    label: "Apartment or landmark (optional)",
    max: 150,
    autoComplete: "address-line2",
    wide: true,
  },
];
async function requestProfile(
  path: string,
  method: string,
  body?: unknown,
): Promise<Profile> {
  const response = await fetch("/api/profile" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Could not save your profile. Please try again.",
    );
  return data.profile;
}
export default function ProfilePage({
  initialProfile,
  states,
}: {
  initialProfile: Profile;
  states: IndianState[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [editing, setEditing] = useState<SavedAddress | null | undefined>(
    undefined,
  );
  const [deleting, setDeleting] = useState<SavedAddress | null>(null);
  const router = useRouter();
  const initialAddress: Partial<Address> = editing || {
    name: profile.name,
    phone: profile.phone,
  };
  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await requestProfile("", "PATCH", { name });
      setProfile(updated);
      setName(updated.name);
      setNotice("Your profile has been saved.");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setDialogError("");
    setNotice("");
    const values = new FormData(event.currentTarget);
    const input = {
      ...Object.fromEntries(values),
      isDefault:
        Boolean(editing?.isDefault) || values.get("isDefault") === "on",
    };
    try {
      setProfile(
        await requestProfile(
          editing
            ? "/addresses/" + encodeURIComponent(editing.id)
            : "/addresses",
          editing ? "PUT" : "POST",
          input,
        ),
      );
      setNotice(
        editing ? "Address updated." : "Address added to your address book.",
      );
      setEditing(undefined);
    } catch (error) {
      setDialogError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function makeDefault(address: SavedAddress) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setProfile(
        await requestProfile(
          "/addresses/" + encodeURIComponent(address.id) + "/default",
          "PATCH",
          {},
        ),
      );
      setNotice(address.label + " is now your default address.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function removeAddress() {
    if (!deleting) return;
    setBusy(true);
    setDialogError("");
    setNotice("");
    try {
      setProfile(
        await requestProfile(
          "/addresses/" + encodeURIComponent(deleting.id),
          "DELETE",
        ),
      );
      setDeleting(null);
      setNotice("Address removed.");
    } catch (error) {
      setDialogError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openAddress(address: SavedAddress | null) {
    setDialogError("");
    setError("");
    setEditing(address);
  }
  return (
    <main className="profile-page">
      <div className="profile-container">
        <nav className="profile-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Your account</span>
        </nav>
        <header className="profile-heading">
          <div>
            <span className="profile-eyebrow">A LITTLE MORE PERSONAL.</span>
            <h1>Your profile.</h1>
            <p>Your details, ready for your next dispatch.</p>
          </div>
          <Link href="/orders">
            View your orders <Icon name="arrow" size={17} />
          </Link>
        </header>
        <div className="profile-layout">
          <aside className="profile-summary" aria-label="Account details">
            <span className="profile-avatar">
              <Icon name="user" size={33} />
            </span>
            <h2>{profile.name || "Welcome to Margyn"}</h2>
            <p>{profile.phone}</p>
            <span className="profile-verified">
              <Icon name="shield" size={13} />
              Phone verified
            </span>
            <div className="profile-member">
              <span>Member since</span>
              <strong>
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeZone: "Asia/Kolkata",
                }).format(profile.createdAt)}
              </strong>
            </div>
            <Link href="/orders">
              <Icon name="layers" size={17} />
              Your orders
              <Icon name="arrow" size={15} />
            </Link>
            <Link href="/categories">
              <Icon name="box" size={17} />
              Explore packaging
              <Icon name="arrow" size={15} />
            </Link>
          </aside>
          <div className="profile-content">
            {notice && (
              <p className="profile-notice" role="status">
                <Icon name="check" size={18} />
                {notice}
              </p>
            )}
            {error && (
              <p className="profile-error" role="alert">
                {error}
              </p>
            )}
            <section
              className="profile-card"
              aria-labelledby="personal-details-title"
            >
              <div className="profile-card-heading">
                <span>
                  <Icon name="user" size={20} />
                </span>
                <div>
                  <h2 id="personal-details-title">Personal details</h2>
                  <p>A familiar name for every order.</p>
                </div>
              </div>
              <form className="profile-details-form" onSubmit={saveName}>
                <div className="profile-form-grid">
                  <label>
                    Full name
                    <input
                      aria-label="Full name"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      placeholder="What should we call you?"
                      value={name}
                      disabled={busy}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <label>
                    Verified mobile number
                    <input
                      aria-label="Verified mobile number"
                      type="tel"
                      value={profile.phone}
                      readOnly
                    />
                    <small>Your number for signing in to Margyn.</small>
                  </label>
                </div>
                <button
                  className="profile-primary"
                  disabled={busy}
                  type="submit"
                >
                  <Icon name="check" size={16} />
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </form>
            </section>
            <section
              className="profile-card profile-address-book"
              aria-labelledby="address-book-title"
            >
              <div className="profile-address-heading">
                <div className="profile-card-heading">
                  <span>
                    <Icon name="truck" size={21} />
                  </span>
                  <div>
                    <h2 id="address-book-title">
                      Address book <small>{profile.addresses.length}</small>
                    </h2>
                    <p>Your saved places, for a smoother checkout.</p>
                  </div>
                </div>
                <button
                  className="profile-add-address"
                  disabled={busy || profile.addresses.length >= 10}
                  onClick={() => openAddress(null)}
                >
                  <Icon name="plus" size={16} />
                  Add address
                </button>
              </div>
              {profile.addresses.length ? (
                <div className="profile-address-grid">
                  {profile.addresses.map((address) => (
                    <article
                      className="profile-address-card"
                      key={address.id}
                      aria-label={address.label + " address"}
                    >
                      <div className="profile-address-tags">
                        <span>{address.label}</span>
                        {address.isDefault && (
                          <span className="profile-default-badge">
                            <Icon name="check" size={12} />
                            Default
                          </span>
                        )}
                      </div>
                      <h3>{address.name}</h3>
                      <p>
                        {address.line1}
                        <br />
                        {address.line2 && (
                          <>
                            {address.line2}
                            <br />
                          </>
                        )}
                        {address.city}, {address.state} – {address.pincode}
                      </p>
                      <p className="profile-address-phone">{address.phone}</p>
                      {address.gstin && (
                        <p className="profile-address-gstin">
                          GSTIN: {address.gstin}
                        </p>
                      )}
                      <div className="profile-address-actions">
                        <button
                          disabled={busy}
                          onClick={() => openAddress(address)}
                        >
                          Edit address
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => {
                            setDialogError("");
                            setDeleting(address);
                          }}
                        >
                          Delete address
                        </button>
                      </div>
                      {!address.isDefault && (
                        <button
                          className="profile-set-default"
                          disabled={busy}
                          onClick={() => void makeDefault(address)}
                        >
                          Make default <Icon name="arrow" size={13} />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="profile-empty-address">
                  <span>
                    <Icon name="box" size={34} />
                  </span>
                  <h3>A home for your next delivery.</h3>
                  <p>
                    Save a home or business address and have it ready at
                    checkout.
                  </p>
                  <button
                    className="profile-text-link"
                    onClick={() => openAddress(null)}
                  >
                    Add your first address <Icon name="arrow" size={16} />
                  </button>
                </div>
              )}
            </section>
            <p className="profile-bottom-note">
              <Icon name="shield" size={15} />
              Your profile and saved addresses stay linked to your account.
            </p>
          </div>
        </div>
      </div>
      {editing !== undefined && (
        <Dialog
          title={editing ? "Edit address" : "Add an address"}
          wide
          onClose={() => {
            if (!busy) setEditing(undefined);
          }}
        >
          <form className="profile-address-form" onSubmit={saveAddress}>
            <p className="profile-dialog-description">
              Save a place for your next delivery.
            </p>
            <fieldset disabled={busy}>
              <label>
                Address label
                <input
                  name="label"
                  aria-label="Address label"
                  required
                  maxLength={40}
                  defaultValue={
                    editing?.label ||
                    (profile.addresses.length ? "Work" : "Home")
                  }
                  placeholder="Home, Work, Warehouse…"
                />
              </label>
              <div className="profile-address-fields">
                {fields.map((field) => (
                  <label
                    className={field.wide ? "profile-field-wide" : ""}
                    key={field.key}
                  >
                    {field.label}
                    <input
                      name={field.key}
                      aria-label={field.label}
                      type={field.type || "text"}
                      required={field.required}
                      minLength={field.min}
                      maxLength={field.max}
                      autoComplete={field.autoComplete}
                      pattern={field.pattern}
                      inputMode={field.type === "tel" ? "tel" : "text"}
                      defaultValue={initialAddress[field.key] || ""}
                    />
                  </label>
                ))}
                <div className="profile-field-wide">
                  <AddressLocationFields
                    states={states}
                    initialAddress={initialAddress}
                  />
                </div>
                <label className="profile-field-wide">
                  GSTIN (optional)
                  <input
                    name="gstin"
                    aria-label="GSTIN (optional)"
                    maxLength={15}
                    defaultValue={initialAddress.gstin || ""}
                  />
                </label>
              </div>
              <label className="profile-default-choice">
                <input
                  type="checkbox"
                  name="isDefault"
                  aria-label="Default delivery address"
                  defaultChecked={
                    editing?.isDefault || profile.addresses.length === 0
                  }
                  disabled={editing?.isDefault}
                />
                <span>
                  Default delivery address
                  <small>Have this address selected first at checkout.</small>
                </span>
              </label>
              <div className="profile-dialog-actions">
                <button
                  className="profile-secondary"
                  type="button"
                  onClick={() => setEditing(undefined)}
                >
                  Cancel
                </button>
                <button
                  className="profile-primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save address"}
                  <Icon name="check" size={16} />
                </button>
              </div>
            </fieldset>
            {dialogError && (
              <p className="profile-error" role="alert">
                {dialogError}
              </p>
            )}
          </form>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Remove this address?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p className="profile-dialog-description">
            {deleting.label} will be removed from your address book.
          </p>
          {dialogError && (
            <p className="profile-error" role="alert">
              {dialogError}
            </p>
          )}
          <div className="profile-dialog-actions">
            <button
              className="profile-secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep address
            </button>
            <button
              className="profile-remove-button"
              disabled={busy}
              onClick={() => void removeAddress()}
            >
              {busy ? "Removing…" : "Remove address"}
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
