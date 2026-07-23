/** Review styles for the served shell and static artifact pages. */

/** Review styles appended to the shell stylesheet. */
export const SHELL_REVIEW_CSS = `
.mb-baseline {
  align-items: center;
  color: var(--mb-muted);
  display: flex;
  font-size: 0.8rem;
  gap: 0.45rem;
  margin: 0;
}

.mb-baseline-dot {
  background: var(--mb-changed);
  border-radius: 50%;
  display: inline-block;
  height: 0.5rem;
  width: 0.5rem;
}

.mb-review-nav-total {
  color: var(--mb-muted);
  font-size: 0.78rem;
  margin: 0.2rem 0.45rem 0.6rem;
}

.mb-chg-row {
  align-items: center;
  border-radius: 8px;
  color: var(--mb-text);
  display: flex;
  gap: 0.5rem;
  padding: 0.35rem 0.45rem;
  text-decoration: none;
}

.mb-chg-row[aria-current="page"] {
  background: var(--mokabook-accent-soft);
  box-shadow: inset 3px 0 0 var(--mokabook-accent);
  font-weight: 600;
}

.mb-chg-dot {
  border-radius: 50%;
  flex: none;
  height: 0.55rem;
  width: 0.55rem;
}

.mb-chg-dot--added { background: var(--mb-added); }
.mb-chg-dot--changed { background: var(--mb-changed); }
.mb-chg-dot--removed { background: var(--mb-removed); }
.mb-chg-dot--ignored-only { background: var(--mb-ignored); }
.mb-chg-dot--impacted { background: var(--mokabook-accent); }
.mb-chg-dot--unchanged { background: var(--mb-border); }

.mb-chg-route {
  color: var(--mb-muted);
  display: block;
  font-family: ui-monospace, monospace;
  font-size: 0.7rem;
}

.mb-impact-card {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border);
  border-radius: var(--mb-radius);
  font-size: 0.8rem;
  margin: 0.75rem 0.2rem 0;
  padding: 0.7rem 0.8rem;
}

.mb-impact-card h3 {
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  margin: 0 0 0.35rem;
  text-transform: uppercase;
}

.mb-impact-card p {
  color: var(--mb-muted);
  margin: 0.35rem 0 0;
}

.mb-badge {
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 650;
  padding: 0.15rem 0.6rem;
  text-transform: capitalize;
}

.mb-badge--added { background: var(--mb-added-soft); color: var(--mb-added); }
.mb-badge--changed { background: var(--mb-changed-soft); color: var(--mb-changed); }
.mb-badge--removed { background: var(--mb-removed-soft); color: var(--mb-removed); }
.mb-badge--ignored-only,
.mb-badge--unchanged { background: var(--mb-ignored-soft); color: var(--mb-ignored); }

.mb-cmp-toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.mb-served-reviewbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
}

.mb-panes {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.mb-pane {
  min-width: 0;
}

.mb-pane-label {
  color: var(--mb-muted);
  font-size: 0.78rem;
  margin: 0 0 0.4rem;
}

.mb-pane-doc {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border);
  border-radius: 8px;
  box-shadow: var(--mb-shadow);
  overflow: hidden;
}

.mb-pane-doc--added { border-color: var(--mb-added); }
.mb-pane-doc--removed { border-color: var(--mb-removed); }

.mb-pane-doc .mb-frag {
  height: 70vh;
}

.mb-pane-missing {
  align-items: center;
  border: 1px dashed var(--mb-border);
  border-radius: 8px;
  color: var(--mb-muted);
  display: flex;
  font-size: 0.8rem;
  justify-content: center;
  min-height: 13rem;
  padding: 1rem;
  text-align: center;
}

.mb-panes[data-compare-mode="overlay"],
.mb-panes[data-compare-mode="difference"] {
  grid-template-columns: 1fr;
}

.mb-panes[data-compare-mode="overlay"] .mb-pane,
.mb-panes[data-compare-mode="difference"] .mb-pane {
  grid-area: 1 / 1;
}

.mb-panes[data-compare-mode="overlay"] .mb-pane-label,
.mb-panes[data-compare-mode="difference"] .mb-pane-label {
  display: none;
}

.mb-panes[data-compare-mode="overlay"] .mb-pane--after {
  opacity: 0.5;
}

.mb-panes[data-compare-mode="difference"] .mb-pane--after .mb-pane-doc {
  mix-blend-mode: difference;
}

.mb-panes[data-compare-mode="difference"] {
  background: #fff;
}

.mb-review-foot {
  color: var(--mb-muted);
  font-size: 0.8rem;
}
`;
