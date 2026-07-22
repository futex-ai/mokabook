/** Main-column view styles: screen head, stage, embeds, and the home /
 * missing-route empty states. */

/** Main-column view styles. */
export const SHELL_VIEW_CSS = `
.mbk-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.mbk-screen-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: 12px 24px;
  padding: 14px 24px 13px;
  border-bottom: 1px solid var(--chrome-border);
  background: var(--chrome-surface);
}

.mbk-screen-head-copy {
  min-width: 0;
}

.mbk-screen-head > .mbk-seg {
  margin-left: auto;
}

.mbk-crumbs {
  margin: 0;
  color: var(--chrome-muted);
  font-size: 11.5px;
}

.mbk-crumbs .sep {
  margin: 0 6px;
  opacity: 0.55;
}

.mbk-crumb-link {
  color: inherit;
  text-decoration: none;
  border-radius: 4px;
}

.mbk-crumb-link:hover {
  color: var(--chrome-ink);
  text-decoration: underline;
}

.mbk-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 5px;
}

.mbk-title-row h2 {
  margin: 0;
  font-size: 19px;
  letter-spacing: -0.01em;
}

.mbk-idchip {
  padding: 2px 8px;
  border: 1px solid var(--chrome-border);
  border-radius: 6px;
  background: var(--chrome-bg);
  color: var(--chrome-muted);
  font-family: var(--mono);
  font-size: 11px;
  text-decoration: none;
  cursor: copy;
}

.mbk-seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 8px;
  background: var(--chrome-bg);
  border: 1px solid var(--chrome-border);
}

.mbk-seg span,
.mbk-seg a,
.mbk-seg button {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--chrome-muted);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.mbk-seg span.active,
.mbk-seg a.active,
.mbk-seg button.active,
.mbk-seg [aria-pressed="true"],
.mbk-seg [aria-current="page"] {
  background: var(--chrome-surface);
  color: var(--chrome-ink);
  box-shadow: 0 1px 2px rgba(20, 28, 22, 0.1);
}

.mbk-stage {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 40px;
  min-height: 0;
  padding: 28px;
  overflow: auto;
  background: radial-gradient(
      circle at center,
      rgba(20, 28, 22, 0.05) 1px,
      transparent 1px
    )
    0 0 / 22px 22px;
}

.mbk-frame-wrap {
  min-width: 0;
}

.mbk-frame-mobile {
  flex: 0 0 auto;
}

.mbk-frame-desktop {
  flex: 0 1 1180px;
  min-width: 0;
}

.mbk-frame-desktop .browser-frame {
  width: 100%;
}

.mbk-frame-label {
  margin: 0 0 10px;
  color: var(--chrome-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.mbk-live[data-viewport="mobile"] .mbk-frame-desktop {
  display: none;
}

.mbk-live[data-viewport="desktop"] .mbk-frame-mobile {
  display: none;
}

.mbk-flow {
  flex: 1;
  overflow: auto;
  padding: 28px 28px 40px;
}

.mbk-flow .flow-track {
  gap: 26px;
}

.mbk-flow .flow-step::before {
  top: 32px;
  bottom: -26px;
}

.mbk-flow .flow-step-head h3 {
  font-size: 16px;
}

.mbk-flow-screen {
  margin-left: 44px;
  max-width: 1180px;
}

.mbk-flow-screen .browser-frame {
  height: 640px;
}

.mbk-flow-screen .browser-frame.is-expanded {
  height: auto;
}

.mbk-stage-embed {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 18px 24px;
  overflow: auto;
  background: radial-gradient(
      circle at center,
      rgba(20, 28, 22, 0.05) 1px,
      transparent 1px
    )
    0 0 / 22px 22px;
}

.mbk-stage-embed iframe {
  flex: 1;
  width: 100%;
  min-height: 520px;
  border: 1px solid var(--chrome-border);
  border-radius: 12px;
  background: var(--chrome-surface);
}

.mbk-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 40px;
  text-align: center;
  color: var(--chrome-ink-2);
}

.mbk-empty h2 {
  margin: 0;
  color: var(--chrome-ink);
  font-size: 19px;
}

.mbk-empty p {
  margin: 0;
  max-width: 460px;
  font-size: 13px;
  line-height: 1.55;
}

.mbk-empty-note {
  color: var(--chrome-muted);
  font-size: 12px;
}

.mbk-empty code {
  font-family: var(--mono);
  font-size: 11.5px;
}

.mbk-empty-link {
  margin-top: 8px;
  color: var(--mokabook-accent);
  font-weight: 600;
}

.mbk-frag {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #ffffff;
}

.phone-screen .mbk-frag {
  border-radius: 36px;
}

@media (max-width: 760px) {
  .mbk-screen-head {
    padding: 12px 16px 11px;
  }

  .mbk-screen-head > .mbk-seg {
    flex: 1 0 100%;
    margin-left: 0;
  }

  .mbk-screen-head > .mbk-seg button {
    flex: 1;
  }

  .mbk-stage {
    flex-direction: column;
    align-items: center;
  }

  .mbk-frame-desktop {
    flex: 0 0 auto;
    width: 100%;
  }

  .mbk-flow-screen {
    margin-left: 0;
  }
}
`;
