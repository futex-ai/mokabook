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

interface FrameLabelProps {
  lightOnly?: boolean | undefined;
  text?: string | undefined;
}

/** Uppercase caption above a device chrome, with its color-scheme state. */
function FrameLabel({ lightOnly, text }: FrameLabelProps) {
  if (text === undefined) {
    return null;
  }
  return (
    <p className="mbk-frame-label">
      {text}
      {lightOnly ? (
        <span className="mbk-frame-scheme-note">{" — Light only"}</span>
      ) : null}
    </p>
  );
}

interface PhoneFrameProps {
  children: ReactNode;
  dark?: boolean | undefined;
  label?: string;
  lightOnly?: boolean;
  small?: boolean;
}

/** The clock, signal, Wi-Fi, and battery band reserved above a mobile screen. */
function PhoneStatusBar() {
  return (
    <div className="phone-status">
      <span>9:41</span>
      <span className="phone-status-icons" aria-hidden="true">
        <svg fill="currentColor" height={11} viewBox="0 0 18 12" width={16}>
          <rect height={4} rx={1} width={3} x={0} y={8} />
          <rect height={6.5} rx={1} width={3} x={5} y={5.5} />
          <rect height={9} rx={1} width={3} x={10} y={3} />
          <rect height={11.5} rx={1} width={3} x={15} y={0.5} />
        </svg>
        <svg fill="currentColor" height={11} viewBox="0 0 16 12" width={16}>
          <path d="M8 11.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0-4.8c1.4 0 2.7.5 3.7 1.4l1.4-1.4A8 8 0 0 0 8 4.4a8 8 0 0 0-5.1 1.8l1.4 1.4A5.7 5.7 0 0 1 8 6.4ZM2.2 4.6 .8 3.2A11 11 0 0 1 8 .4a11 11 0 0 1 7.2 2.8l-1.4 1.4A9 9 0 0 0 8 2.4a9 9 0 0 0-5.8 2.2Z" />
        </svg>
        <svg height={11} viewBox="0 0 24 12" width={22}>
          <rect
            fill="none"
            height={10}
            rx={2.5}
            stroke="currentColor"
            width={20}
            x={1}
            y={1}
          />
          <rect
            fill="currentColor"
            height={4}
            rx={0.6}
            width={1.6}
            x={22}
            y={4}
          />
          <rect
            fill="currentColor"
            height={6.8}
            rx={1.4}
            width={14}
            x={2.8}
            y={2.6}
          />
        </svg>
      </span>
    </div>
  );
}

/** Realistic phone chrome around a mobile fragment depiction. */
export function PhoneFrame({
  children,
  dark,
  label,
  lightOnly,
  small,
}: PhoneFrameProps) {
  return (
    <div className="mbk-frame-wrap mbk-frame-mobile">
      <FrameLabel lightOnly={lightOnly} text={label} />
      <div className={small ? "phone-frame phone-frame--sm" : "phone-frame"}>
        <div className="phone-notch" aria-hidden="true" />
        <div className={dark ? "phone-screen mbk-screen-dark" : "phone-screen"}>
          <PhoneStatusBar />
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
  dark?: boolean | undefined;
  label?: string;
  lightOnly?: boolean;
}

/** Browser chrome with traffic lights, address, and expand control. */
export function BrowserFrame({
  address,
  children,
  dark,
  label,
  lightOnly,
}: BrowserFrameProps) {
  return (
    <div className="mbk-frame-wrap mbk-frame-desktop">
      <FrameLabel lightOnly={lightOnly} text={label} />
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
        <div
          className={
            dark ? "browser-viewport mbk-screen-dark" : "browser-viewport"
          }
        >
          {children}
        </div>
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
