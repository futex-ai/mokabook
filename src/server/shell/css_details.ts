/** Details inspector styles: the collapsible bottom panel, its two-column
 * body, and the metadata rows and chips it renders. */

/** Details inspector styles. */
export const SHELL_DETAILS_CSS = `
.mbk-details {
  flex-shrink: 0;
  border-top: 1px solid var(--chrome-border);
  background: var(--chrome-surface);
}

.mbk-details-bar {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 11px 24px;
  border: none;
  background: none;
  color: var(--chrome-ink);
  font-size: 12.5px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.mbk-details-bar .chev {
  display: inline-grid;
  place-items: center;
  color: var(--chrome-muted);
}

.mbk-details-bar .chev svg {
  transition: transform 0.15s ease;
}

summary.mbk-details-bar {
  list-style: none;
}

summary.mbk-details-bar::-webkit-details-marker {
  display: none;
}

details.mbk-details[open] > summary.mbk-details-bar .chev svg {
  transform: rotate(90deg);
}

.mbk-details-hint {
  margin-left: auto;
  color: var(--chrome-muted);
  font-weight: 400;
}

.mbk-details-body {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 30px;
  padding: 6px 24px 20px;
}

.mbk-details-desc {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--chrome-ink);
}

.mbk-details-rationale {
  margin: 12px 0 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--chrome-ink-2);
}

.mbk-details-rationale .k {
  color: var(--chrome-muted);
  font-weight: 700;
}

.mbk-meta {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.mbk-meta-row {
  display: grid;
  grid-template-columns: 82px 1fr;
  gap: 12px;
  align-items: baseline;
}

.mbk-meta-k {
  color: var(--chrome-muted);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.mbk-meta-v {
  min-width: 0;
  font-size: 12.5px;
  color: var(--chrome-ink-2);
}

.mbk-code {
  display: inline-block;
  max-width: 100%;
  padding: 2px 7px;
  border: 1px solid var(--chrome-border);
  border-radius: 6px;
  background: var(--chrome-bg);
  color: var(--chrome-ink);
  font-family: var(--mono);
  font-size: 11px;
  word-break: break-all;
}

.mbk-meta-v a {
  color: var(--mokabook-accent);
  font-weight: 600;
  text-decoration: none;
}

.mbk-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mbk-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border: 1px solid var(--chrome-border);
  border-radius: 999px;
  background: var(--chrome-bg);
  color: var(--chrome-ink-2);
  font-size: 11.5px;
  text-decoration: none;
}

.mbk-chip.flow svg {
  flex-shrink: 0;
  color: var(--mokabook-accent);
}

@media (max-width: 56.25rem) {
  .mbk-details-body {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
`;
