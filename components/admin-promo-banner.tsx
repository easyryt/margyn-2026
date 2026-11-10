"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PromoBannerSettings } from "@/lib/types";
import PromoBanner from "./promo-banner";
import { Icon } from "./icons";

const DEFAULT_ARTWORK = "/images/margyn-custom-packaging.png";
export default function AdminPromoBanner({
  settings,
  onSaved,
}: {
  settings: PromoBannerSettings;
  onSaved: (settings: PromoBannerSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  function change(
    key: keyof PromoBannerSettings,
    value: string | boolean | string[],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    setNotice("");
    setUploading(true);
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Choose an image smaller than 5 MB.");
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
        throw new Error("Choose a JPG, PNG or WebP image.");
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not upload the banner image.");
      setDraft((current) => ({ ...current, image: data.url }));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/promo-banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          features: draft.features.filter((value) => value.trim()),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save the promotional banner.");
      setDraft(data.banner);
      onSaved(data.banner);
      setNotice("Promotional banner saved. Your homepage is up to date.");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="promo-editor" aria-label="Promotional banner settings">
      <form
        className="announcement-settings-card form-fields promo-editor-form"
        onSubmit={save}
      >
        <div className="announcement-card-heading">
          <h2>Second banner settings</h2>
          <p>
            This banner appears below the seller toolkit, just above your
            footer.
          </p>
        </div>
        <fieldset disabled={busy || uploading} className="promo-editor-fields">
          <label className="announcement-visibility">
            <input
              type="checkbox"
              aria-label="Show promotional banner"
              checked={draft.enabled}
              onChange={(event) => change("enabled", event.target.checked)}
            />
            <span>
              Show promotional banner
              <small>Hide it without losing the content you saved.</small>
            </span>
          </label>
          <div className="promo-field-group">
            <h3>Message</h3>
            <label>
              Banner label
              <input
                aria-label="Promotional banner label"
                value={draft.eyebrow}
                maxLength={60}
                onChange={(event) => change("eyebrow", event.target.value)}
              />
            </label>
            <label>
              Title
              <input
                aria-label="Promotional banner title"
                required
                value={draft.title}
                maxLength={100}
                onChange={(event) => change("title", event.target.value)}
              />
            </label>
            <label>
              Highlighted line
              <input
                aria-label="Promotional highlighted line"
                value={draft.highlight}
                maxLength={100}
                onChange={(event) => change("highlight", event.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                aria-label="Promotional banner description"
                value={draft.description}
                maxLength={600}
                rows={3}
                onChange={(event) => change("description", event.target.value)}
              />
            </label>
            {[0, 1, 2].map((index) => (
              <label key={index}>
                Highlight {index + 1}
                <input
                  aria-label={"Promotional highlight " + (index + 1)}
                  value={draft.features[index] || ""}
                  maxLength={100}
                  onChange={(event) => {
                    const features = [0, 1, 2].map(
                      (i) => draft.features[i] || "",
                    );
                    features[index] = event.target.value;
                    change("features", features);
                  }}
                />
              </label>
            ))}
          </div>
          <div className="promo-field-group">
            <h3>Buttons</h3>
            <label>
              Primary button label
              <input
                aria-label="Primary banner button label"
                required
                maxLength={40}
                value={draft.primaryLabel}
                onChange={(event) => change("primaryLabel", event.target.value)}
              />
            </label>
            <label>
              Primary button link
              <input
                aria-label="Primary banner button link"
                required
                maxLength={500}
                value={draft.primaryHref}
                onChange={(event) => change("primaryHref", event.target.value)}
              />
              <small className="announcement-field-hint">
                Use a local path or a full HTTPS link.
              </small>
            </label>
            <label>
              Secondary button label
              <input
                aria-label="Secondary banner button label"
                maxLength={40}
                value={draft.secondaryLabel}
                onChange={(event) =>
                  change("secondaryLabel", event.target.value)
                }
              />
            </label>
            <label>
              Secondary button link
              <input
                aria-label="Secondary banner button link"
                maxLength={500}
                value={draft.secondaryHref}
                onChange={(event) =>
                  change("secondaryHref", event.target.value)
                }
              />
              <small className="announcement-field-hint">
                Leave both secondary fields empty to show one button.
              </small>
            </label>
          </div>
          <div className="promo-field-group">
            <h3>Artwork</h3>
            <div className="promo-upload-preview">
              <img src={draft.image} alt="Promotional banner image preview" />
            </div>
            <div className="promo-upload-actions">
              <label className="promo-upload-control">
                <Icon name="upload" size={17} />
                <span>{uploading ? "Uploading…" : "Upload image"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Upload promotional banner image"
                  onChange={(event) => {
                    void upload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                className="announcement-reset-button"
                onClick={() => change("image", DEFAULT_ARTWORK)}
              >
                Use default artwork
              </button>
            </div>
            <p className="announcement-field-hint">
              JPG, PNG or WebP, up to 5 MB. Transparent artwork works best.
            </p>
            <label>
              Image URL
              <input
                aria-label="Promotional banner image URL"
                required
                maxLength={1000}
                value={draft.image}
                onChange={(event) => change("image", event.target.value)}
              />
              <small className="announcement-field-hint">
                Use the default artwork or an image uploaded to your ImageKit
                account.
              </small>
            </label>
            <label>
              Image description
              <input
                aria-label="Promotional image description"
                required
                maxLength={180}
                value={draft.imageAlt}
                onChange={(event) => change("imageAlt", event.target.value)}
              />
            </label>
          </div>
          <div className="promo-field-group">
            <h3>Style and image badge</h3>
            <div className="announcement-color-fields promo-color-fields">
              {[
                { key: "backgroundColor", label: "Background" },
                { key: "textColor", label: "Text" },
                { key: "accentColor", label: "Accent" },
              ].map(({ key, label }) => (
                <label key={key}>
                  {label}
                  <input
                    type="color"
                    aria-label={"Promotional " + label.toLowerCase() + " color"}
                    value={
                      draft[
                        key as "backgroundColor" | "textColor" | "accentColor"
                      ]
                    }
                    onChange={(event) =>
                      change(
                        key as keyof PromoBannerSettings,
                        event.target.value,
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <label>
              Image badge title
              <input
                aria-label="Promotional image badge title"
                maxLength={40}
                value={draft.badgeTitle}
                onChange={(event) => change("badgeTitle", event.target.value)}
              />
            </label>
            <label>
              Image badge description
              <input
                aria-label="Promotional image badge description"
                maxLength={120}
                value={draft.badgeText}
                onChange={(event) => change("badgeText", event.target.value)}
              />
            </label>
          </div>
          <div className="announcement-form-actions">
            <button
              className="button announcement-save-button"
              disabled={busy || uploading}
            >
              <Icon name="check" size={17} />
              {busy ? "Saving…" : "Save promotional banner"}
            </button>
            <button
              className="announcement-reset-button"
              type="button"
              onClick={() => {
                setDraft(settings);
                setError("");
                setNotice("");
              }}
            >
              Reset changes
            </button>
          </div>
        </fieldset>
        {uploading && (
          <p role="status" className="announcement-field-hint">
            Uploading image to ImageKit…
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="announcement-save-notice" role="status">
            <Icon name="check" size={17} />
            {notice}
          </p>
        )}
      </form>
      <aside className="announcement-settings-card promo-editor-preview">
        <div className="announcement-preview-heading">
          <h2>Live preview</h2>
          <span
            className={
              "announcement-preview-status" +
              (draft.enabled ? "" : " is-hidden")
            }
          >
            {draft.enabled ? "Visible" : "Hidden"}
          </span>
        </div>
        <p>Preview your second homepage banner before saving.</p>
        <div className="promo-preview-surface">
          <PromoBanner settings={draft} preview />
        </div>
        {!draft.enabled && (
          <p className="promo-hidden-note">
            Hidden on the homepage. The preview stays visible while you edit.
          </p>
        )}
        <a
          className="announcement-store-link"
          href="/#custom-packaging"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open homepage <Icon name="external" size={15} />
        </a>
      </aside>
    </section>
  );
}
