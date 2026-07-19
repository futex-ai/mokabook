import type { ReactNode } from "react";

/** Rendering target for a design mockup artboard. */
export type ArtboardViewport = "desktop" | "mobile";

/** Top-level Browse/Review mode depicted by a shell mockup. */
export type ShellMode = "browse" | "review";

interface TopBarProps {
  mode: ShellMode;
  viewport: ArtboardViewport;
}

/** Shell header with brand, mode switch, search, and filter. */
export function TopBar({ mode, viewport }: TopBarProps) {
  return (
    <header className="mb-topbar">
      {viewport === "mobile" ? (
        <button
          className="mb-menu-button"
          type="button"
          aria-label="Open catalogue navigation"
        >
          ☰
        </button>
      ) : null}
      <span className="mb-brand">
        <span className="mb-brand-mark" aria-hidden="true" />
        Mokabook
      </span>
      <nav className="mb-modes" aria-label="Mokabook modes">
        <span
          className="mb-mode"
          aria-current={mode === "browse" ? "page" : undefined}
        >
          Browse
        </span>
        <span
          className="mb-mode"
          aria-current={mode === "review" ? "page" : undefined}
        >
          Review
        </span>
      </nav>
      {viewport === "desktop" && mode === "browse" ? (
        <>
          <span className="mb-search">Search screens…</span>
          <span
            className="mb-filter"
            role="group"
            aria-label="Catalogue filter"
          >
            <span className="mb-filter-option" aria-pressed="true">
              All
            </span>
            <span className="mb-filter-option" aria-pressed="false">
              Changed
            </span>
          </span>
        </>
      ) : null}
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

/** The neutral Mokabook shell scaffold for one design mockup. */
export function Shell({ aside, children, mode, nav, viewport }: ShellProps) {
  if (viewport === "desktop") {
    return (
      <div className="mb-shell mb-shell--desktop">
        <TopBar mode={mode} viewport={viewport} />
        {nav}
        <main className="mb-main">{children}</main>
      </div>
    );
  }
  return (
    <div className="mb-shell mb-shell--mobile">
      <TopBar mode={mode} viewport={viewport} />
      <main className="mb-main">{children}</main>
      {aside}
    </div>
  );
}

interface BreadcrumbsProps {
  trail: readonly string[];
}

/** Ancestor collection trail above a routed catalogue view. */
export function Breadcrumbs({ trail }: BreadcrumbsProps) {
  return (
    <nav className="mb-breadcrumbs" aria-label="Catalogue location">
      {trail.map((crumb, index) => (
        <span key={crumb}>
          {index > 0 ? " › " : null}
          {index < trail.length - 1 ? (
            <span className="mb-crumb">{crumb}</span>
          ) : (
            crumb
          )}
        </span>
      ))}
    </nav>
  );
}

interface TitleRowProps {
  address?: string;
  title: string;
  withDetailsToggle?: boolean;
}

/** Routed-view heading with address chip and details toggle. */
export function TitleRow({ address, title, withDetailsToggle }: TitleRowProps) {
  return (
    <div className="mb-title-row">
      <h1>{title}</h1>
      {address ? <span className="mb-address">{address}</span> : null}
      {withDetailsToggle ? (
        <button className="mb-details-toggle" type="button">
          Details
        </button>
      ) : null}
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
    <div className="mb-viewswitch" role="group" aria-label="Viewport">
      {options.map((option) => (
        <span
          key={option.key}
          className="mb-viewswitch-option"
          aria-pressed={option.key === active ? "true" : "false"}
        >
          {option.label}
        </span>
      ))}
    </div>
  );
}
