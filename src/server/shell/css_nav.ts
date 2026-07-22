/** Shell scaffold styles: full-height frame, top bar, and the catalogue
 * navigation column with its filter, tree rows, icons, and drawer states. */

/** Top bar and navigation styles. */
export const SHELL_NAV_CSS = `
.mbk-fs {
  margin: 0;
  height: 100vh;
  overflow: hidden;
}

.mbk {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--chrome-bg);
  color: var(--chrome-ink);
  font-family: var(--sans);
  font-size: 13px;
}

.mbk-skip-link {
  position: absolute;
  top: -100%;
  left: 12px;
  z-index: 20;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--chrome-ink);
  color: #ffffff;
  font-weight: 600;
  text-decoration: none;
}

.mbk-skip-link:focus-visible {
  top: 8px;
}

.mbk-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 48px;
  flex-shrink: 0;
  padding: 0 16px;
  background: var(--chrome-surface);
  border-bottom: 1px solid var(--chrome-border);
}

.mbk-menu {
  display: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--chrome-border);
  border-radius: 8px;
  background: var(--chrome-surface);
  color: var(--chrome-ink-2);
  font-size: 14px;
  cursor: pointer;
}

.mbk-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: inherit;
  text-decoration: none;
}

.mbk-mark {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--mokabook-accent);
  color: var(--mokabook-accent-contrast);
  font-size: 13px;
}

.mbk-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 440px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--chrome-border);
  border-radius: 8px;
  background: var(--chrome-bg);
  color: var(--chrome-muted);
}

.mbk-search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  color: var(--chrome-ink);
  font: inherit;
  outline: none;
}

.mbk-search input::placeholder {
  color: var(--chrome-muted);
}

.mbk-modes {
  display: flex;
  gap: 4px;
  margin-left: auto;
  padding: 3px;
  border-radius: 8px;
  background: var(--chrome-bg);
}

.mbk-mode {
  padding: 4px 12px;
  border-radius: 6px;
  color: var(--chrome-muted);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.mbk-mode.active,
.mbk-mode[aria-current="page"] {
  background: var(--chrome-surface);
  color: var(--chrome-ink);
  box-shadow: 0 1px 2px rgba(20, 28, 22, 0.08);
}

.mbk-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.mbk-route-status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.mbk-nav {
  --mbk-guide: #dbded8;
  display: flex;
  flex-direction: column;
  width: 248px;
  flex-shrink: 0;
  background: #fbfbfa;
  border-right: 1px solid var(--chrome-border);
  overflow: hidden;
}

.mbk-nav-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px 9px;
  color: var(--chrome-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mbk-nav-collapse {
  padding: 0;
  border: none;
  background: none;
  color: var(--chrome-muted);
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;
}

.mbk-nav-filter {
  display: inline-flex;
  align-self: flex-start;
  margin: 0 8px 8px;
  padding: 3px;
  border-radius: 8px;
  background: var(--chrome-bg);
  border: 1px solid var(--chrome-border);
}

.mbk-nav-filter-opt {
  display: flex;
  align-items: center;
  padding: 4px 11px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--chrome-muted);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.mbk-nav-filter-opt.active,
.mbk-nav-filter-opt[aria-pressed="true"] {
  background: var(--chrome-surface);
  color: var(--chrome-ink);
  box-shadow: 0 1px 2px rgba(20, 28, 22, 0.1);
}

.mbk-nav-filter-count {
  margin-left: 5px;
  color: var(--chrome-muted);
  font-family: var(--mono);
  font-size: 10px;
}

.mbk-nav-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 12px;
}

.mbk-nav-row {
  position: relative;
  z-index: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 5px 8px;
  color: var(--chrome-ink-2);
  text-decoration: none;
  font-size: 12.5px;
  line-height: 1.3;
  cursor: pointer;
}

.mbk-nav-row::before {
  content: "";
  position: absolute;
  z-index: -1;
  top: 0;
  bottom: 0;
  left: var(--mbk-indent, 0);
  right: 0;
  border-radius: 6px;
}

.mbk-nav-row:hover::before {
  background: var(--mokabook-accent-soft);
}

.mbk-nav-row.active,
.mbk-nav-row[aria-current="page"] {
  color: var(--mokabook-accent-contrast);
  font-weight: 600;
}

.mbk-nav-row.active::before,
.mbk-nav-row[aria-current="page"]::before {
  background: var(--mokabook-accent);
}

.mbk-nav-label {
  font-weight: 600;
  color: var(--chrome-ink);
}

.mbk-nav-ico {
  display: inline-grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--chrome-muted);
}

.mbk-nav-ico.flow {
  color: var(--mokabook-accent);
}

.mbk-nav-ico.folder {
  color: var(--chrome-ink-2);
}

.mbk-nav-ico.folder > svg {
  grid-area: 1 / 1;
}

.mbk-nav-ico.folder > svg:nth-child(2) {
  display: none;
}

details.mbk-nav-group[open] > summary .mbk-nav-ico.folder > svg:nth-child(1) {
  display: none;
}

details.mbk-nav-group[open] > summary .mbk-nav-ico.folder > svg:nth-child(2) {
  display: block;
}

.mbk-nav-row.active .mbk-nav-ico,
.mbk-nav-row[aria-current="page"] .mbk-nav-ico {
  color: rgba(255, 255, 255, 0.9);
}

.mbk-nav-row.active .mbk-nav-label,
.mbk-nav-row[aria-current="page"] .mbk-nav-label {
  color: var(--mokabook-accent-contrast);
}

.mbk-nav-count {
  margin-left: auto;
  color: var(--chrome-muted);
  font-family: var(--mono);
  font-size: 10.5px;
}

.mbk-nav-row.active .mbk-nav-count,
.mbk-nav-row[aria-current="page"] .mbk-nav-count {
  color: rgba(255, 255, 255, 0.75);
}

.mbk-nav-row[hidden],
details.mbk-nav-group[hidden] {
  display: none;
}

details.mbk-nav-group > summary {
  list-style: none;
}

details.mbk-nav-group > summary::-webkit-details-marker {
  display: none;
}

@media (max-width: 56.25rem) {
  .mbk-menu {
    display: inline-flex;
  }

  .mbk-nav {
    display: none;
    position: absolute;
    top: 48px;
    bottom: 0;
    left: 0;
    z-index: 10;
    width: 82%;
    max-width: 20rem;
    border-right: 1px solid var(--chrome-border);
    box-shadow: 0 0 0 100vmax rgba(20, 28, 22, 0.4);
  }

  .mbk[data-drawer="open"] .mbk-nav {
    display: flex;
  }
}
`;
