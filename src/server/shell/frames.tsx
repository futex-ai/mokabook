// The realistic device chrome the served shell wraps around every embedded
// screen fragment: a dark-bezel phone with notch and home pill, and a browser
// window with traffic lights, a monospace address pill, and the
// expand-to-overlay toggle handled by the Browse client.

import type { ReactNode } from "react";

/** A 390×844 phone body whose screen area hosts the mobile fragment. */
export function PhoneFrame(props: { children?: ReactNode }) {
  return (
    <div className="phone-frame">
      <div className="phone-notch" />
      <div className="phone-screen">{props.children}</div>
      <div className="phone-home" />
    </div>
  );
}

/** A desktop browser window whose viewport hosts the desktop fragment. */
export function BrowserFrame(props: { address: string; children?: ReactNode }) {
  return (
    <div className="browser-frame">
      <div className="browser-bar">
        <span className="lights">
          <i />
          <i />
          <i />
        </span>
        <span className="address">{props.address}</span>
        <button
          aria-expanded="false"
          aria-label="Expand to a wider viewport"
          className="browser-expand"
          title="Expand to a wider viewport"
          type="button"
        >
          <span aria-hidden="true" className="i-expand">
            ⤢
          </span>
          <span aria-hidden="true" className="i-collapse">
            ⤡
          </span>
        </button>
      </div>
      <div className="browser-viewport">{props.children}</div>
    </div>
  );
}
