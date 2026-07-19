/** Package-owned, self-contained Mokabook shell stylesheet. */

import { SHELL_REVIEW_CSS } from "./css_review.js";
import { SHELL_VIEW_CSS } from "./css_views.js";

const SHELL_BASE_CSS = `
:root {
  --mokabook-accent: #6f4e37;
  --mokabook-accent-contrast: #ffffff;
  --mokabook-accent-soft: #f2eae3;
  --mb-bg: #f6f5f3;
  --mb-surface: #ffffff;
  --mb-border: #ddd8d1;
  --mb-text: #27211b;
  --mb-muted: #6f675d;
  --mb-radius: 10px;
  --mb-shadow: 0 1px 2px rgb(39 33 27 / 8%);
  --mb-added: #1d7a3d;
  --mb-added-soft: #e3f0e7;
  --mb-changed: #9a6b00;
  --mb-changed-soft: #f6ecd4;
  --mb-removed: #b3261e;
  --mb-removed-soft: #f7e2e0;
  --mb-ignored: #6c6862;
  --mb-ignored-soft: #edebe8;
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

body {
  background: var(--mb-bg);
  color: var(--mb-text);
  font: 14px/1.45 system-ui, sans-serif;
  margin: 0;
  min-height: 100vh;
}

a {
  color: var(--mokabook-accent);
}

:focus-visible {
  outline: 2px solid var(--mokabook-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto !important;
    transition: none !important;
  }
}

.mb-sr-only {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.mb-skip-link {
  background: var(--mb-surface);
  border-radius: 0 0 8px;
  left: 0;
  padding: 0.5rem 0.9rem;
  position: absolute;
  top: 0;
  transform: translateY(-120%);
  z-index: 3;
}

.mb-skip-link:focus {
  transform: none;
}

.mb-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
}

.mb-topbar {
  align-items: center;
  background: var(--mb-surface);
  border-bottom: 1px solid var(--mb-border);
  display: flex;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
}

.mb-brand {
  align-items: center;
  color: inherit;
  display: flex;
  font-weight: 650;
  gap: 0.45rem;
  letter-spacing: 0.01em;
  text-decoration: none;
}

.mb-brand-mark {
  background: var(--mokabook-accent);
  border-radius: 50%;
  display: inline-block;
  height: 1.15rem;
  width: 1.15rem;
}

.mb-menu-button {
  background: none;
  border: 1px solid var(--mb-border);
  border-radius: 8px;
  color: var(--mb-text);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0.35rem 0.55rem;
}

.mb-modes {
  display: flex;
  gap: 0.25rem;
}

.mb-mode {
  border-radius: 999px;
  color: var(--mb-muted);
  padding: 0.3rem 0.8rem;
  text-decoration: none;
}

.mb-mode[aria-current="page"] {
  background: var(--mokabook-accent);
  color: var(--mokabook-accent-contrast);
}

.mb-search {
  background: var(--mb-bg);
  border: 1px solid var(--mb-border);
  border-radius: 8px;
  color: var(--mb-text);
  display: none;
  flex: 1;
  font: inherit;
  max-width: 18rem;
  padding: 0.35rem 0.7rem;
}

.mb-filter {
  background: var(--mb-bg);
  border: 1px solid var(--mb-border);
  border-radius: 999px;
  display: none;
  margin-left: auto;
  padding: 0.15rem;
}

.mb-filter-option,
.mb-viewswitch-option {
  background: none;
  border: 0;
  border-radius: 999px;
  color: var(--mb-muted);
  cursor: pointer;
  font: inherit;
  padding: 0.2rem 0.75rem;
  text-decoration: none;
}

.mb-filter-option[aria-pressed="true"] {
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow);
  color: var(--mb-text);
  font-weight: 600;
}

.mb-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.mb-nav {
  background: var(--mb-surface);
  border-right: 1px solid var(--mb-border);
  bottom: 0;
  box-shadow: 0 0 0 100vmax rgb(39 33 27 / 40%);
  display: none;
  left: 0;
  max-width: 20rem;
  overflow-y: auto;
  padding: 0.9rem 0.7rem;
  position: absolute;
  top: 0;
  width: 82%;
  z-index: 2;
}

.mb-shell[data-drawer="open"] .mb-nav {
  display: block;
}

.mb-nav-group {
  color: var(--mb-muted);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  margin: 0.9rem 0.45rem 0.3rem;
  text-transform: uppercase;
}

.mb-nav-group:first-child {
  margin-top: 0;
}

.mb-nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mb-nav li li {
  padding-left: 0.9rem;
}

.mb-nav details {
  margin: 0;
}

.mb-nav summary {
  cursor: pointer;
  list-style: none;
}

.mb-nav summary::-webkit-details-marker {
  display: none;
}

.mb-nav-row {
  align-items: center;
  border-radius: 8px;
  color: var(--mb-text);
  display: flex;
  gap: 0.4rem;
  padding: 0.32rem 0.45rem;
  text-decoration: none;
}

.mb-nav-row[hidden] {
  display: none;
}

.mb-caret {
  color: var(--mb-muted);
  font-size: 0.7rem;
}

.mb-nav details[open] > summary .mb-caret--folder {
  transform: rotate(90deg);
}

.mb-nav-row[aria-current="page"] {
  background: var(--mokabook-accent-soft);
  box-shadow: inset 3px 0 0 var(--mokabook-accent);
  font-weight: 600;
}

.mb-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.9rem;
  min-width: 0;
  padding: 1rem 1.25rem 2rem;
}

.mb-breadcrumbs {
  color: var(--mb-muted);
  font-size: 0.8rem;
}

.mb-breadcrumbs a {
  color: inherit;
}

.mb-title-row {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.mb-title-row h1 {
  font-size: 1.25rem;
  margin: 0;
}

.mb-address {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border);
  border-radius: 999px;
  color: var(--mb-muted);
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  padding: 0.15rem 0.6rem;
}

.mb-viewswitch {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border);
  border-radius: 999px;
  display: inline-flex;
  padding: 0.15rem;
  width: fit-content;
}

.mb-viewswitch-option[aria-pressed="true"],
.mb-viewswitch-option[aria-current="page"] {
  background: var(--mokabook-accent);
  color: var(--mokabook-accent-contrast);
  font-weight: 600;
}

@media (min-width: 56.25rem) {
  .mb-menu-button {
    display: none;
  }

  .mb-search,
  .mb-filter {
    display: block;
  }

  .mb-filter {
    display: flex;
  }

  .mb-nav {
    box-shadow: none;
    display: block;
    flex: none;
    max-width: none;
    position: static;
    width: 16.25rem;
  }
}
`;

/** Complete shell stylesheet served at /__mokabook/shell.css. */
export const SHELL_CSS = `${SHELL_BASE_CSS}${SHELL_VIEW_CSS}${SHELL_REVIEW_CSS}`;
