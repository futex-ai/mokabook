/** Legacy base styles the static Review artifact pages still use. The
 * artifact markup keeps its `mb-*` classes and inlines the shell stylesheet,
 * so this subset must stay styled alongside the review module. */

/** Legacy `mb-*` base styles for generated Review artifact pages. */
export const SHELL_ARTIFACT_CSS = `
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

.mb-nav-group {
  color: var(--mb-muted);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  margin: 0.9rem 0.45rem 0.3rem;
  text-transform: uppercase;
}

.mb-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mb-viewswitch {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border);
  border-radius: 999px;
  display: inline-flex;
  padding: 0.15rem;
  width: fit-content;
}

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

.mb-viewswitch-option[aria-pressed="true"],
.mb-viewswitch-option[aria-current="page"] {
  background: var(--mokabook-accent);
  color: var(--mokabook-accent-contrast);
  font-weight: 600;
}

.mb-code {
  background: var(--mb-bg);
  border: 1px solid var(--mb-border);
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 0.72rem;
  overflow-wrap: anywhere;
  padding: 0.05rem 0.4rem;
}

.mb-empty {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 3rem 1.5rem;
  text-align: center;
}

.mb-empty h1 {
  font-size: 1.3rem;
  margin: 0;
}

.mb-empty-link {
  color: var(--mokabook-accent);
  font-weight: 600;
}

.mb-frag {
  border: 0;
  display: block;
  min-height: 30rem;
  width: 100%;
}
`;
