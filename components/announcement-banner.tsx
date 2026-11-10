"use client";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import type { AnnouncementSettings } from "@/lib/types";

export default function AnnouncementBanner({
  settings,
  preview = false,
}: {
  settings: AnnouncementSettings | null;
  preview?: boolean;
}) {
  const pathname = usePathname();
  if (
    !settings ||
    (!preview &&
      (!settings.enabled ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/tools")))
  )
    return null;
  const message = settings.message.trim() || "Your announcement message";
  const speed = { slow: 1.5, normal: 1, fast: 0.7 }[settings.speed];
  const style = {
    backgroundColor: settings.backgroundColor,
    color: settings.textColor,
    "--announcement-duration": Math.max(28, message.length * 0.8) * speed + "s",
  } as CSSProperties;
  const track = (
    <div className="announcement-track" aria-hidden="true">
      {[0, 1].map((group) => (
        <div className="announcement-group" key={group}>
          {[0, 1, 2, 3].map((index) => (
            <span className="announcement-item" key={index}>
              <span>{message}</span>
              <i />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
  return (
    <section
      className="announcement-bar"
      style={style}
      aria-label={preview ? "Announcement preview" : "Store announcement"}
    >
      {settings.link && !preview ? (
        <a
          className="announcement-viewport"
          href={settings.link}
          aria-label={message}
        >
          {track}
        </a>
      ) : (
        <div className="announcement-viewport" tabIndex={0}>
          <span className="announcement-sr-only">{message}</span>
          {track}
        </div>
      )}
    </section>
  );
}
