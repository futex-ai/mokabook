import type { ReactNode } from "react";

/** The dotted screen stage holding the device chromes. */
export function Stage({ children }: { children: ReactNode }) {
  return <div className="mbk-stage">{children}</div>;
}

interface MiniScreenProps {
  compact?: boolean;
  revised?: boolean;
  tinted?: boolean;
}

/** Miniature depiction of the example Welcome fragment. */
export function MiniWelcome({ compact, revised, tinted }: MiniScreenProps) {
  return (
    <div className="mbk-shot">
      <div className="mbk-shot-pad">
        <div className="mbk-shot-nav">
          {compact ? "Menu" : "Example navigation"}
        </div>
        <h2 className={tinted ? "mbk-diff-changed" : undefined}>
          {revised ? "Welcome to the Mokabook example" : "Welcome to Mokabook"}
        </h2>
        {revised ? (
          <p className={tinted ? "mbk-diff-added" : undefined}>
            A short introduction now welcomes new readers.
          </p>
        ) : null}
        <span className="mbk-shot-link">Open the details screen</span>
      </div>
    </div>
  );
}

/** Miniature depiction of the example Details fragment. */
export function MiniDetails({ compact }: MiniScreenProps) {
  return (
    <div className="mbk-shot">
      <div className="mbk-shot-pad">
        <h2>{compact ? "Details" : "Example catalogue details"}</h2>
        <p>This screen is synthetic and belongs only to the package example.</p>
        <span className="mbk-shot-link">Return to welcome</span>
      </div>
    </div>
  );
}

/** Miniature depiction of a retired synthetic screen. */
export function MiniFarewell({ compact }: MiniScreenProps) {
  return (
    <div className="mbk-shot">
      <div className="mbk-shot-pad">
        <h2>{compact ? "Goodbye" : "Goodbye for now"}</h2>
        <p>Sign back in at any time to continue.</p>
        <span className="mbk-shot-link">Return to welcome</span>
      </div>
    </div>
  );
}

interface PhoneFrameProps {
  children: ReactNode;
  label?: string;
  small?: boolean;
}

/** Realistic phone chrome around a mobile fragment depiction. */
export function PhoneFrame({ children, label, small }: PhoneFrameProps) {
  return (
    <div className="mbk-frame-wrap mbk-frame-mobile">
      {label ? <p className="mbk-frame-label">{label}</p> : null}
      <div className={small ? "phone-frame phone-frame--sm" : "phone-frame"}>
        <div className="phone-notch" aria-hidden="true" />
        <div className="phone-screen">
          {children}
          <div className="phone-home" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

interface BrowserFrameProps {
  address: string;
  children: ReactNode;
  label?: string;
}

/** Browser chrome with traffic lights, address, and expand control. */
export function BrowserFrame({ address, children, label }: BrowserFrameProps) {
  return (
    <div className="mbk-frame-wrap mbk-frame-desktop">
      {label ? <p className="mbk-frame-label">{label}</p> : null}
      <div className="browser-frame">
        <div className="browser-bar">
          <span className="lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="address">{address}</span>
          <span className="browser-expand" aria-hidden="true">
            ⤢
          </span>
        </div>
        <div className="browser-viewport">{children}</div>
      </div>
    </div>
  );
}

interface FlowStepProps {
  children: ReactNode;
  description: string;
  number: number;
  screenId: string;
  title: string;
}

/** One ordered use-case step embedding an existing screen. */
export function FlowStep({
  children,
  description,
  number,
  screenId,
  title,
}: FlowStepProps) {
  return (
    <section className="flow-step">
      <div className="flow-step-head">
        <span className="flow-step-num">{number}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
          <span className="flow-step-link">
            This screen in the catalogue: #{screenId} →
          </span>
        </div>
      </div>
      <div className="mbk-flow-screen">{children}</div>
    </section>
  );
}

interface EmptyStateProps {
  body: string;
  code?: string;
  linkLabel: string;
  title: string;
}

/** Centered home, missing-route, or empty-result view. */
export function EmptyState({ body, code, linkLabel, title }: EmptyStateProps) {
  return (
    <div className="mbk-empty">
      <h2>{title}</h2>
      <p>
        {body}
        {code ? (
          <>
            {" "}
            <code>{code}</code>
          </>
        ) : null}
      </p>
      <span className="mbk-empty-link">{linkLabel}</span>
    </div>
  );
}
