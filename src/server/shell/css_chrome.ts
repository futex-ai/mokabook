/** Device chrome styles: the phone body, browser window, expand overlay, and
 * the numbered flow track shared by use-case views. */

/** Phone, browser, expand-overlay, and flow-track styles. */
export const SHELL_CHROME_CSS = `
.phone-frame {
  position: relative;
  width: 390px;
  height: 844px;
  padding: 12px;
  border-radius: 46px;
  background: #171a18;
}

.phone-notch {
  position: absolute;
  top: 22px;
  left: 50%;
  z-index: 2;
  width: 108px;
  height: 30px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #0b0d0c;
}

.phone-screen {
  position: relative;
  height: 100%;
  overflow: hidden;
  border-radius: 36px;
  background: #ffffff;
}

.phone-home {
  position: absolute;
  left: 50%;
  bottom: 20px;
  width: 128px;
  height: 4px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(20, 24, 20, 0.4);
}

.browser-frame {
  width: 100%;
  max-width: 1180px;
  height: 760px;
  overflow: hidden;
  border: 1px solid var(--chrome-border-strong);
  border-radius: 8px;
  background: var(--chrome-surface);
}

.browser-bar {
  position: relative;
  height: 40px;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 0 14px;
  background: #ecede9;
  border-bottom: 1px solid var(--chrome-border);
}

.lights {
  display: inline-flex;
  gap: 6px;
}

.lights i {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: var(--chrome-border-strong);
}

.lights i:first-child {
  background: #d9655b;
}

.lights i:nth-child(2) {
  background: #dba43d;
}

.lights i:nth-child(3) {
  background: #50a86d;
}

.address {
  flex: 1;
  max-width: 520px;
  height: 26px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--chrome-border);
  border-radius: 6px;
  background: var(--chrome-surface);
  color: var(--chrome-muted);
  font-family: var(--mono);
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.address::after {
  content: "⧉";
  margin-left: auto;
  padding-left: 10px;
  color: var(--chrome-border-strong);
  font-size: 11px;
  opacity: 0.7;
}

.address:hover {
  background: #ffffff;
  color: var(--chrome-ink);
}

.address:hover::after {
  opacity: 1;
  color: var(--chrome-accent);
}

.address-copied {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--chrome-ink);
  color: #ffffff;
  padding: 5px 10px;
  border-radius: 6px;
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 6px 16px rgba(20, 28, 22, 0.18);
  animation: addressCopiedIn 0.18s ease-out;
}

.address-copied::before {
  content: "";
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: var(--chrome-ink);
}

@keyframes addressCopiedIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.browser-viewport {
  height: calc(100% - 40px);
  overflow: hidden;
  background: var(--chrome-surface);
}

.browser-expand {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--chrome-border);
  border-radius: 6px;
  background: var(--chrome-surface);
  color: var(--chrome-muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
}

.browser-expand:hover {
  background: #ffffff;
  color: var(--chrome-accent);
  border-color: var(--chrome-border-strong);
}

.browser-expand .i-collapse {
  display: none;
}

.browser-frame.is-expanded .browser-expand {
  color: var(--chrome-accent);
  border-color: var(--chrome-accent);
}

.browser-frame.is-expanded .browser-expand .i-expand {
  display: none;
}

.browser-frame.is-expanded .browser-expand .i-collapse {
  display: inline;
}

body.frame-expanded {
  overflow: hidden;
}

body.frame-expanded::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(20, 28, 22, 0.55);
}

.browser-frame.is-expanded {
  position: fixed;
  inset: 2.5vh 2.5vw;
  z-index: 950;
  width: auto;
  max-width: none;
  height: auto;
  box-shadow: 0 40px 120px rgba(20, 28, 22, 0.4);
}

.flow-track {
  display: flex;
  flex-direction: column;
  gap: 34px;
}

.flow-step {
  position: relative;
}

.flow-step::before {
  content: "";
  position: absolute;
  left: 15px;
  top: 34px;
  bottom: -34px;
  width: 2px;
  background: var(--chrome-border);
}

.flow-step:last-child::before {
  display: none;
}

.flow-step-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.flow-step-num {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--mokabook-accent);
  color: var(--mokabook-accent-contrast);
  font-size: 13px;
  font-weight: 800;
}

.flow-step-head h3 {
  margin: 2px 0 4px;
  font-size: 18px;
  letter-spacing: -0.005em;
}

.flow-step-head p {
  margin: 0;
  color: var(--chrome-muted);
  font-size: 14px;
  line-height: 1.55;
}

.flow-step-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--mokabook-accent);
  text-decoration: none;
}

.flow-step-link:hover {
  text-decoration: underline;
}

@media (max-width: 760px) {
  .phone-frame {
    width: min(390px, 100%);
    height: auto;
    aspect-ratio: 390 / 844;
  }

  .browser-frame {
    width: 100%;
    min-width: 0;
    height: 560px;
  }

  .flow-step::before {
    display: none;
  }
}
`;
