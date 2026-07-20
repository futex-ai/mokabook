import type { ReactNode } from "react";

/** Rendering target for a design mockup artboard. */
export type ArtboardViewport = "desktop" | "mobile";

/** Top-level Browse/Review mode depicted by a shell mockup. */
export type ShellMode = "browse" | "review";

interface TopBarProps {
  mode: ShellMode;
  viewport: ArtboardViewport;
}

function BaseWatch() {
  return (
    <span className="mbk-basewatch">
      <span className="mbk-basewatch-dot" aria-hidden="true" />
      Comparing this branch with <strong>origin/main</strong>
    </span>
  );
}

/** The 48px shell header: brand mark, search or base ref, mode switch. */
export function TopBar({ mode, viewport }: TopBarProps) {
  return (
    <header className="mbk-topbar">
      {viewport === "mobile" ? (
        <button
          className="mbk-menu-btn"
          type="button"
          aria-label="Open catalogue navigation"
        >
          ☰
        </button>
      ) : null}
      <span className="mbk-brand">
        <span className="mbk-mark" aria-hidden="true">
          ◫
        </span>
        Mokabook
      </span>
      {viewport === "desktop" ? (
        mode === "review" ? (
          <BaseWatch />
        ) : (
          <span className="mbk-search">
            <span aria-hidden="true">⌕</span>Search screens…
          </span>
        )
      ) : null}
      <nav className="mbk-modes" aria-label="Mokabook modes">
        <span className={mode === "browse" ? "mbk-mode active" : "mbk-mode"}>
          Browse
        </span>
        <span className={mode === "review" ? "mbk-mode active" : "mbk-mode"}>
          Review
        </span>
      </nav>
    </header>
  );
}

interface ShellProps {
  aside?: ReactNode;
  children: ReactNode;
  mode: ShellMode;
  nav: ReactNode;
  viewport: ArtboardViewport;
}

/** The Mokabook shell scaffold for one design mockup. */
export function Shell({ aside, children, mode, nav, viewport }: ShellProps) {
  if (viewport === "desktop") {
    return (
      <div className="mbk-shell mbk-shell--desktop">
        <TopBar mode={mode} viewport={viewport} />
        <div className="mbk-body">
          {nav}
          <main className="mbk-main">{children}</main>
        </div>
      </div>
    );
  }
  return (
    <div className="mbk-shell mbk-shell--mobile">
      <TopBar mode={mode} viewport={viewport} />
      <main className="mbk-main">{children}</main>
      {aside}
    </div>
  );
}

interface CrumbsProps {
  items: readonly string[];
}

/** Ancestor collection trail above a routed catalogue view. */
export function Crumbs({ items }: CrumbsProps) {
  return (
    <nav className="mbk-crumbs" aria-label="Catalogue location">
      {items.map((item, index) => (
        <span key={item}>
          {index > 0 ? <span className="sep">›</span> : null}
          {item}
        </span>
      ))}
    </nav>
  );
}

interface ScreenHeadProps {
  action?: ReactNode;
  crumbs: readonly string[];
  idChip?: string;
  status?: ReactNode;
  title: string;
}

/** The white head band: breadcrumbs, title, id chip, and status. */
export function ScreenHead({
  action,
  crumbs,
  idChip,
  status,
  title,
}: ScreenHeadProps) {
  return (
    <div className="mbk-screen-head">
      <div>
        <Crumbs items={crumbs} />
        <div className="mbk-title-row">
          <h2>{title}</h2>
          {idChip ? <span className="mbk-idchip">{idChip}</span> : null}
          {status}
        </div>
      </div>
      {action}
    </div>
  );
}

interface ViewSwitchProps {
  active: "both" | "desktop" | "mobile";
}

/** Viewport selection control shown above a screen stage. */
export function ViewSwitch({ active }: ViewSwitchProps) {
  const options: readonly { key: ViewSwitchProps["active"]; label: string }[] =
    [
      { key: "mobile", label: "Mobile" },
      { key: "desktop", label: "Desktop" },
      { key: "both", label: "Both" },
    ];
  return (
    <div className="mbk-viewbar">
      <span className="mbk-seg" role="group" aria-label="Viewport">
        {options.map((option) => (
          <span
            key={option.key}
            className={option.key === active ? "active" : undefined}
          >
            {option.label}
          </span>
        ))}
      </span>
    </div>
  );
}
