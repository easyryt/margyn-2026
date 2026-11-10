import Image from "next/image";
import brandLogo from "@/public/images/margyn-logo.png";
import type { CSSProperties } from "react";
export function Icon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const paths: Record<string, React.ReactNode> = {
    file: (
      <>
        <path d="M14 2H5v20h14V7Z" />
        <path d="M14 2v5h5M8 12h8M8 16h6" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6 6a8 8 0 0 1 13 2M18 18a8 8 0 0 1-13-2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    sliders: (
      <>
        <path d="M5 3v5m0 4v9M12 3v10m0 4v4M19 3v2m0 4v12M2 8h6M9 17h6M16 5h6" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    ),
    box: (
      <>
        <path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" />
        <path d="m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6l8-3Z" />
        <path d="m8 11 3 3 5-5" />
      </>
    ),
    truck: (
      <>
        <path d="M2 5h13v12H2zM15 9h4l3 4v4h-7" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H4v16h5m5-12 4 4-4 4M8 12h12" />
      </>
    ),
    edit: (
      <>
        <path d="m15 4 5 5M4 20l5-1L21 7a3.5 3.5 0 0 0-5-5L4 14l-1 7Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6" />
      </>
    ),
    phone: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M10 18h4" />
      </>
    ),
    tag: (
      <>
        <path d="M3 3h8l10 10-8 8L3 11V3Z" />
        <circle cx="7.5" cy="7.5" r=".8" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5" />
      </>
    ),
    crop: (
      <>
        <path d="M6 2v16h16M2 6h16v16" />
      </>
    ),
    calculator: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M8 6h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3c0 12-3 16-10 16S1 7 20 3Z" />
        <path d="M4 21 15 10" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
      </>
    ),
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    external: (
      <>
        <path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {paths[name] || paths.box}
    </svg>
  );
}
function BrandMark() {
  return (
    <Image
      className="margyn-logo-image"
      src={brandLogo}
      alt=""
      width={60}
      height={40}
      sizes="(max-width: 760px) 48px, 66px"
      loading="eager"
      aria-hidden="true"
    />
  );
}
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? "brand-light" : ""}`}>
      <BrandMark />
      <span>
        MARGYN<span className="brand-dot">.</span>
        <small>THE PACKAGING EXCHANGE</small>
      </span>
    </span>
  );
}

export function MargynLogo() {
  return (
    <span className="margyn-wordmark">
      <BrandMark />
      <span>
        margyn<span className="wordmark-point">.</span>
      </span>
    </span>
  );
}
