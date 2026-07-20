// Shared Mokabook shell glyphs: the disclosure chevron, the closed / open
// folder icons for collapsible collections, and the screen / page / use-case
// leaf icons. All icons are stroke-based on a 24-unit viewBox and inherit
// `currentColor`. The navigation tree drops the chevron in favour of the
// folder icon, swapping the closed folder for the open one while a group is
// expanded (see `.mbk-nav-ico.folder` in the shell stylesheet); the chevron is
// used by the details inspector bar.

import type { ReactNode } from "react";

function IconSvg(props: { children: ReactNode; size: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={props.size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={props.size}
    >
      {props.children}
    </svg>
  );
}

/** Disclosure chevron for collapsible groups and the details bar. */
export function ChevronIcon(props: { size?: number }) {
  return (
    <IconSvg size={props.size ?? 13}>
      <polyline points="9 6 15 12 9 18" />
    </IconSvg>
  );
}

/** A collapsed collection: a closed folder that groups child screens/pages. */
export function FolderIcon(props: { size?: number }) {
  return (
    <IconSvg size={props.size ?? 13}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </IconSvg>
  );
}

/** An expanded collection: an open folder revealing its contents. */
export function FolderOpenIcon(props: { size?: number }) {
  return (
    <IconSvg size={props.size ?? 13}>
      <path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
    </IconSvg>
  );
}

/** A structured screen: one product state in a browser window. */
export function ScreenIcon(props: { size?: number }) {
  return (
    <IconSvg size={props.size ?? 13}>
      <rect height={16} rx={2} width={18} x={3} y={4} />
      <path d="M3 9h18" />
    </IconSvg>
  );
}

/** A legacy catalogue page: a document that may hold several states. */
export function PageIcon(props: { size?: number }) {
  return (
    <IconSvg size={props.size ?? 13}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </IconSvg>
  );
}

/** A use case: connected steps through canonical screens. */
export function FlowIcon(props: { size?: number }) {
  return (
    <IconSvg size={props.size ?? 13}>
      <rect height={8} rx={2} width={8} x={3} y={3} />
      <path d="M7 11v4a2 2 0 0 0 2 2h4" />
      <rect height={8} rx={2} width={8} x={13} y={13} />
    </IconSvg>
  );
}
