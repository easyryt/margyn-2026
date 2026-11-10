/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import type { PromoBannerSettings } from "@/lib/types";
import { Icon } from "./icons";

export default function PromoBanner({
  settings,
  preview = false,
}: {
  settings: PromoBannerSettings | null;
  preview?: boolean;
}) {
  if (!settings || (!settings.enabled && !preview)) return null;
  const style = {
    "--promo-background": settings.backgroundColor,
    "--promo-text": settings.textColor,
    "--promo-accent": settings.accentColor,
  } as CSSProperties;
  const titleId = preview ? "promo-preview-title" : "promo-banner-title";
  return (
    <section
      className={"promo-banner" + (preview ? " is-preview" : "")}
      id={preview ? undefined : "custom-packaging"}
      style={style}
      aria-labelledby={titleId}
    >
      <div className="promo-inner">
        <div className="promo-copy">
          {settings.eyebrow && (
            <span className="promo-eyebrow">
              <Icon name="box" size={16} />
              {settings.eyebrow}
            </span>
          )}
          <h2 id={titleId}>
            {settings.title}
            {settings.highlight && (
              <>
                <br />
                <span>{settings.highlight}</span>
              </>
            )}
          </h2>
          {settings.description && (
            <p className="promo-description">{settings.description}</p>
          )}
          {!!settings.features.length && (
            <ul className="promo-features">
              {settings.features.map((feature, index) => (
                <li key={index}>
                  <span>
                    <Icon name={["truck", "box", "spark"][index]} size={20} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          )}
          <div className="promo-actions">
            {preview ? (
              <span className="promo-primary">
                {settings.primaryLabel || "Primary button"}
                <Icon name="arrow" size={17} />
              </span>
            ) : (
              <a className="promo-primary" href={settings.primaryHref}>
                {settings.primaryLabel}
                <Icon name="arrow" size={17} />
              </a>
            )}
            {settings.secondaryLabel &&
              settings.secondaryHref &&
              (preview ? (
                <span className="promo-secondary">
                  {settings.secondaryLabel}
                  <Icon name="arrow" size={16} />
                </span>
              ) : (
                <a className="promo-secondary" href={settings.secondaryHref}>
                  {settings.secondaryLabel}
                  <Icon name="arrow" size={16} />
                </a>
              ))}
          </div>
        </div>
        <div className="promo-art">
          <div className="promo-art-label" aria-hidden="true">
            MARGYN / THE PACKAGING STUDIO<span>02</span>
          </div>
          {settings.badgeTitle && (
            <div className="promo-image-badge">
              <span>
                <Icon name="spark" size={22} />
              </span>
              <div>
                <strong>{settings.badgeTitle}</strong>
                {settings.badgeText && <p>{settings.badgeText}</p>}
              </div>
            </div>
          )}
          <img
            src={settings.image}
            alt={settings.imageAlt}
            width={1536}
            height={1024}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
