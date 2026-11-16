"use client";

import { useEffect, useId, useRef } from "react";

export default function ToolTips({ tips, label }: { tips: readonly string[]; label?: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = bubble.current;
    const button = trigger.current;
    if (!panel || !button) return;

    const position = () => {
      if (!panel.matches(":popover-open")) return;

      const anchor = button.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const edge = 12;
      const gap = 9;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const center = anchor.left + anchor.width / 2;
      const left = Math.min(Math.max(edge, center - width / 2), viewportWidth - width - edge);
      const above = anchor.bottom + gap + height > viewportHeight - edge && anchor.top > viewportHeight - anchor.bottom;
      const top = above ? anchor.top - gap - height : anchor.bottom + gap;
      panel.style.left = `${left}px`;
      panel.style.top = `${Math.min(Math.max(edge, top), viewportHeight - height - edge)}px`;
      panel.style.setProperty("--tip-arrow", `${Math.min(Math.max(14, center - left), width - 14)}px`);
      panel.dataset.placement = above ? "above" : "below";
    };

    function stopTracking() {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    }

    function syncPosition() {
      if (panel?.matches(":popover-open")) {
        position();
        window.addEventListener("resize", position);
        window.addEventListener("scroll", position, true);
      } else {
        stopTracking();
      }
    }

    panel.addEventListener("toggle", syncPosition);
    syncPosition();
    return () => {
      panel.removeEventListener("toggle", syncPosition);
      stopTracking();
    };
  }, []);

  return (
    <div className="seller-tool-tips">
      <button ref={trigger} type="button" className="tool-tip-trigger" aria-label={label ? `Help with ${label}` : "Tips"} popoverTarget={id}>
        <span className="tool-tip-icon" aria-hidden="true">?</span>
        {!label && <span>Tips</span>}
      </button>
      <div ref={bubble} id={id} popover="auto" className="tool-tip-bubble" role="region" aria-label={label ?? "Tips"}>
        {tips.length === 1 ? <p>{tips[0]}</p> : <ul>{tips.map(tip => <li key={tip}>{tip}</li>)}</ul>}
      </div>
    </div>
  );
}
