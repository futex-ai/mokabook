import type { ReactNode } from "react";

interface IconProps {
  size?: number;
}

function IconSvg({ children, size }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size ?? 13}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size ?? 13}
    >
      {children}
    </svg>
  );
}

/** Disclosure chevron for collapsible groups and the details bar. */
export function ChevronIcon({ size }: IconProps) {
  return (
    <IconSvg size={size ?? 13}>
      <polyline points="9 6 15 12 9 18" />
    </IconSvg>
  );
}

/** A collapsed collection: a closed folder grouping child screens. */
export function FolderIcon({ size }: IconProps) {
  return (
    <IconSvg size={size ?? 13}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </IconSvg>
  );
}

/** An expanded collection: an open folder revealing its contents. */
export function FolderOpenIcon({ size }: IconProps) {
  return (
    <IconSvg size={size ?? 13}>
      <path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
    </IconSvg>
  );
}

/** A canonical screen: one product state in a browser window. */
export function ScreenIcon({ size }: IconProps) {
  return (
    <IconSvg size={size ?? 13}>
      <rect height={16} rx={2} width={18} x={3} y={4} />
      <path d="M3 9h18" />
    </IconSvg>
  );
}

/** A document page, used for related-doc references. */
export function PageIcon({ size }: IconProps) {
  return (
    <IconSvg size={size ?? 13}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </IconSvg>
  );
}

/** A use case: connected steps through canonical screens. */
export function FlowIcon({ size }: IconProps) {
  return (
    <IconSvg size={size ?? 13}>
      <rect height={8} rx={2} width={8} x={3} y={3} />
      <path d="M7 11v4a2 2 0 0 0 2 2h4" />
      <rect height={8} rx={2} width={8} x={13} y={13} />
    </IconSvg>
  );
}
