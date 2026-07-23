/** Shell-design styles for Review pages: the changed-screens navigation
 * column, classification status badges, the compare head and toolbar, and the
 * scrollable compare stage the design mockups specify. */

/** Review shell styles appended to the shell stylesheet. */
export const SHELL_REVIEW_SHELL_CSS = `
.mbk-nav-total {
  color: var(--chrome-muted);
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.mbk-chg-group {
  margin-bottom: 8px;
}

.mbk-chg-grouphead {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 10px 8px 4px;
  color: var(--chrome-ink);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.mbk-chg-count {
  margin-left: auto;
  color: var(--chrome-muted);
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.mbk-chg-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  color: inherit;
  text-decoration: none;
}

.mbk-chg-row:hover {
  background: var(--mokabook-accent-soft);
}

.mbk-chg-row.active {
  background: var(--mokabook-accent);
}

.mbk-chg-row.active .mbk-chg-dot {
  background: rgba(255, 255, 255, 0.9);
}

.mbk-chg-row.active .mbk-chg-text strong,
.mbk-chg-row.active .mbk-chg-text span {
  color: var(--mokabook-accent-contrast);
}

.mbk-chg-text {
  flex: 1;
  min-width: 0;
}

.mbk-chg-text strong {
  display: block;
  overflow: hidden;
  color: var(--chrome-ink);
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mbk-chg-text span {
  display: block;
  overflow: hidden;
  color: var(--chrome-muted);
  font-family: var(--mono);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mbk-chg-more {
  margin: 2px 8px 0;
  color: var(--chrome-muted);
  font-size: 11px;
}

.mbk-chg-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--chrome-border-strong);
}

.mbk-chg-dot.added { background: var(--mb-added); }
.mbk-chg-dot.changed { background: var(--mb-changed); }
.mbk-chg-dot.removed { background: var(--mb-removed); }
.mbk-chg-dot.ignored-only { background: var(--mb-ignored); }
.mbk-chg-dot.impacted { background: var(--mokabook-accent); }

.mbk-chg-shared {
  margin: 12px 8px 0;
  padding: 11px 12px;
  border: 1px solid var(--chrome-border);
  border-radius: 10px;
  background: var(--chrome-surface);
}

.mbk-chg-shared strong {
  font-size: 12px;
}

.mbk-chg-shared p {
  margin: 4px 0 0;
  color: var(--chrome-muted);
  font-size: 11.5px;
  line-height: 1.5;
}

.mbk-chg-shared code {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: var(--chrome-ink);
  font-family: var(--mono);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mbk-chg-ignored-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}

.mbk-chg-ignored-head code {
  display: inline;
  margin-top: 0;
}

.mbk-chg-ignored-head span {
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--chrome-bg);
  color: var(--chrome-muted);
  font-size: 9.5px;
  font-weight: 700;
}

.mbk-status {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
}

.mbk-status.added { background: var(--mb-added-soft); color: var(--mb-added); }
.mbk-status.changed { background: var(--mb-changed-soft); color: var(--mb-changed); }
.mbk-status.removed { background: var(--mb-removed-soft); color: var(--mb-removed); }
.mbk-status.ignored-only,
.mbk-status.unchanged { background: var(--mb-ignored-soft); color: var(--mb-ignored); }

.mbk-cmp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: 12px 16px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--chrome-border);
  background: var(--chrome-surface);
}

.mbk-rvw-stage {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 24px;
}

.mbk-review-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 10px 24px;
  border-top: 1px solid var(--chrome-border);
  background: var(--chrome-surface);
}

.mbk-review-facts {
  color: var(--chrome-muted);
  font-size: 12px;
}

@media (max-width: 56.25rem) {
  .mbk-cmp-toolbar,
  .mbk-rvw-stage,
  .mbk-review-summary {
    padding-left: 16px;
    padding-right: 16px;
  }
}
`;
