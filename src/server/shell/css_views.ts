/** Stage, details, flow, and empty-state styles for the shell. */

/** Stage and details styles appended to the base shell stylesheet. */
export const SHELL_VIEW_CSS = `
.mb-stage {
  align-items: flex-start;
  background-image: radial-gradient(rgb(39 33 27 / 6%) 1px, transparent 1px);
  background-size: 22px 22px;
  border: 1px solid var(--mb-border);
  border-radius: var(--mb-radius);
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
  padding: 1.5rem;
}

.mb-stage figure {
  margin: 0;
}

[data-viewport="mobile"] .mb-frame--desktop,
[data-viewport="desktop"] .mb-frame--mobile {
  display: none;
}

.mb-phone {
  background: var(--mb-surface);
  border: 2px solid var(--mb-text);
  border-radius: 26px;
  box-shadow: var(--mb-shadow);
  overflow: hidden;
  width: 24.5rem;
}

.mb-phone-notch {
  background: var(--mb-text);
  border-radius: 999px;
  height: 0.45rem;
  margin: 0.5rem auto;
  width: 5rem;
}

.mb-browser {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border);
  border-radius: 8px;
  box-shadow: var(--mb-shadow);
  flex: 1;
  min-width: 22rem;
  overflow: hidden;
}

.mb-browser-bar {
  align-items: center;
  background: var(--mb-bg);
  border-bottom: 1px solid var(--mb-border);
  display: flex;
  gap: 0.6rem;
  padding: 0.45rem 0.7rem;
}

.mb-browser-dots {
  display: flex;
  gap: 0.3rem;
}

.mb-browser-dots span {
  background: var(--mb-border);
  border-radius: 50%;
  display: block;
  height: 0.55rem;
  width: 0.55rem;
}

.mb-browser-address {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border);
  border-radius: 6px;
  color: var(--mb-muted);
  flex: 1;
  font-family: ui-monospace, monospace;
  font-size: 0.72rem;
  padding: 0.2rem 0.6rem;
}

.mb-frame-label {
  color: var(--mb-muted);
  font-size: 0.75rem;
  margin: 0 0 0.4rem;
  text-align: center;
}

.mb-frag {
  border: 0;
  display: block;
  min-height: 30rem;
  width: 100%;
}

.mb-embed .mb-frag {
  min-height: 70vh;
}

.mb-details {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border);
  border-radius: var(--mb-radius);
}

.mb-details summary {
  align-items: baseline;
  cursor: pointer;
  display: flex;
  font-weight: 600;
  gap: 0.6rem;
  padding: 0.6rem 0.9rem;
}

.mb-details-hint {
  color: var(--mb-muted);
  font-size: 0.78rem;
  font-weight: 400;
}

.mb-details-body {
  border-top: 1px solid var(--mb-border);
  display: grid;
  gap: 0.9rem 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  padding: 0.9rem;
}

.mb-details-body h3 {
  color: var(--mb-muted);
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  margin: 0 0 0.3rem;
  text-transform: uppercase;
}

.mb-details-body p,
.mb-details-body ul {
  margin: 0;
}

.mb-details-body ul {
  list-style: none;
  padding: 0;
}

.mb-code {
  background: var(--mb-bg);
  border: 1px solid var(--mb-border);
  border-radius: 6px;
  font-family: ui-monospace, monospace;
  font-size: 0.72rem;
  overflow-wrap: anywhere;
  padding: 0.05rem 0.4rem;
}

.mb-chip-link {
  color: var(--mokabook-accent);
}

.mb-steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.mb-step {
  border-left: 2px solid var(--mb-border);
  padding-left: 1rem;
}

.mb-step-num {
  align-items: center;
  background: var(--mokabook-accent);
  border-radius: 50%;
  color: var(--mokabook-accent-contrast);
  display: inline-flex;
  font-size: 0.75rem;
  font-weight: 650;
  height: 1.4rem;
  justify-content: center;
  margin-right: 0.5rem;
  width: 1.4rem;
}

.mb-step-title {
  font-weight: 600;
}

.mb-step-link {
  color: var(--mokabook-accent);
  font-size: 0.8rem;
  margin-left: 0.6rem;
}

.mb-step .mb-stage {
  margin-top: 0.6rem;
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

.mb-empty p {
  color: var(--mb-muted);
  margin: 0;
  max-width: 30rem;
}

.mb-empty-link {
  color: var(--mokabook-accent);
  font-weight: 600;
}
`;
