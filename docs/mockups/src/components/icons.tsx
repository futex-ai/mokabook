import type { ReactNode } from "react";

type IconName =
  | "arrow"
  | "branch"
  | "check"
  | "code"
  | "comment"
  | "copy"
  | "desktop"
  | "grid"
  | "menu"
  | "mobile"
  | "play"
  | "spark";

const paths: Record<IconName, ReactNode> = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  branch: (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M6 7v10m12-9a7 7 0 0 1-7 7H6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  code: (
    <>
      <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />
    </>
  ),
  comment: <path d="M20 11a8 8 0 0 1-8 8H4l1.5-4A8 8 0 1 1 20 11Z" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <path d="M15 8V3H3v13h5" />
    </>
  ),
  desktop: (
    <>
      <rect x="3" y="3" width="18" height="13" rx="2" />
      <path d="M12 16v5m-5 0h10" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  mobile: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M10 18h4" />
    </>
  ),
  play: <path d="m8 4 12 8-12 8Z" />,
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
      <path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z" />
    </>
  ),
};

export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function BrandMark() {
  return (
    <svg
      className="brand-mark"
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7c5-2 8-1 11 2 3-3 6-4 11-2v19c-5-2-8-1-11 1-3-2-6-3-11-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 9v18M9 11v10m14-10v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
