"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AnnouncementSettings } from "@/lib/types";
import AnnouncementBanner from "./announcement-banner";
import { Icon } from "./icons";

export default function AdminAnnouncement({
  settings,
  onSaved,
}: {
  settings: AnnouncementSettings;
  onSaved: (settings: AnnouncementSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save your announcement.");
      setDraft(data.announcement);
      onSaved(data.announcement);
      setNotice("Announcement saved. Your storefront is up to date.");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="announcement-editor" aria-label="Announcement settings">
      <form className="announcement-settings-card form-fields" onSubmit={save}>
        <div className="announcement-card-heading">
          <h2>Banner settings</h2>
          <p>A short message that keeps moving, right above your navigation.</p>
        </div>
        <fieldset disabled={busy}>
          <label className="announcement-visibility">
            <input
              type="checkbox"
              aria-label="Show banner on storefront"
              checked={draft.enabled}
              onChange={(event) =>
                setDraft({ ...draft, enabled: event.target.checked })
              }
            />
            <span>
              Show banner on storefront
              <small>Turn it off without losing your saved message.</small>
            </span>
          </label>
          <label>
            <span className="announcement-label-row">
              <span>Banner message</span>
              <small>{draft.message.length}/180</small>
            </span>
            <textarea
              aria-label="Banner message"
              rows={3}
              required
              maxLength={180}
              value={draft.message}
              onChange={(event) =>
                setDraft({ ...draft, message: event.target.value })
              }
            />
          </label>
          <label>
            Banner link (optional)
            <input
              type="text"
              inputMode="url"
              aria-label="Banner link (optional)"
              maxLength={500}
              placeholder="/#catalog or https://example.com"
              value={draft.link}
              onChange={(event) =>
                setDraft({ ...draft, link: event.target.value })
              }
            />
            <small className="announcement-field-hint">
              Use a page on your store or a full HTTPS link.
            </small>
          </label>
          <div className="announcement-color-fields">
            <label>
              Background color
              <input
                type="color"
                aria-label="Background color"
                value={draft.backgroundColor}
                onChange={(event) =>
                  setDraft({ ...draft, backgroundColor: event.target.value })
                }
              />
              <small>{draft.backgroundColor.toUpperCase()}</small>
            </label>
            <label>
              Text color
              <input
                type="color"
                aria-label="Text color"
                value={draft.textColor}
                onChange={(event) =>
                  setDraft({ ...draft, textColor: event.target.value })
                }
              />
              <small>{draft.textColor.toUpperCase()}</small>
            </label>
          </div>
          <label>
            Scroll speed
            <select
              aria-label="Scroll speed"
              value={draft.speed}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  speed: event.target.value as AnnouncementSettings["speed"],
                })
              }
            >
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
          </label>
          <div className="announcement-form-actions">
            <button className="button announcement-save-button" disabled={busy}>
              <Icon name="check" size={17} />
              {busy ? "Saving…" : "Save announcement"}
            </button>
            <button
              type="button"
              className="announcement-reset-button"
              disabled={busy}
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
      <aside className="announcement-settings-card announcement-preview-card">
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
        <p>Try your message, colors and speed before saving.</p>
        <div className="announcement-preview-frame">
          <AnnouncementBanner settings={draft} preview />
        </div>
        <p className="announcement-preview-caption">
          The banner repeats continuously across the top of your storefront.
          Hover over the message or focus it with your keyboard to stop the
          animation.
        </p>
        {!draft.enabled && (
          <p className="announcement-hidden-note">
            The banner is hidden on your storefront. This preview stays visible
            while you edit.
          </p>
        )}
        <div className="announcement-preview-details">
          <span>Link destination</span>
          <strong>{draft.link || "No link — message only"}</strong>
        </div>
        <a
          className="announcement-store-link"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open storefront <Icon name="external" size={15} />
        </a>
      </aside>
    </section>
  );
}
