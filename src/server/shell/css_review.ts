/** Compare-stage styles shared by served Review pages and the static
 * artifact: the before/after pane grid with its side-by-side, overlay, and
 * difference modes, embedded pane frames, and evidence cards. */

/** Review compare-stage styles appended to the shell stylesheet. */
export const SHELL_REVIEW_CSS = `
.mb-frag {
  border: 0;
  display: block;
  min-height: 30rem;
  width: 100%;
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

.mb-panes[data-compare-mode="overlay"] .mb-pane--after {
  opacity: 0.5;
}

.mb-panes[data-compare-mode="difference"] .mb-pane--after .mb-pane-doc {
  mix-blend-mode: difference;
}

.mb-panes[data-compare-mode="difference"] {
  background: #fff;
}

.mb-impact-card {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border);
  border-radius: var(--mb-radius);
  flex-shrink: 0;
  font-size: 0.8rem;
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
`;
