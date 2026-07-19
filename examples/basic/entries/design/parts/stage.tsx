import type { ReactNode } from "react";

interface MiniScreenProps {
  compact?: boolean;
  revised?: boolean;
  tinted?: boolean;
}

/** Miniature depiction of the example Welcome fragment. */
export function MiniWelcome({ compact, revised, tinted }: MiniScreenProps) {
  return (
    <div className="mb-mini">
      <div className="mb-mini-nav">
        {compact ? "Menu" : "Example navigation"}
      </div>
      <h2 className={tinted ? "mb-diff-changed" : undefined}>
        {revised ? "Welcome to the Mokabook example" : "Welcome to Mokabook"}
      </h2>
      {revised ? (
        <p className={tinted ? "mb-diff-added" : undefined}>
          A short introduction now welcomes new readers.
        </p>
      ) : null}
      <span className="mb-mini-link">Open the details screen</span>
    </div>
  );
}

/** Miniature depiction of the example Details fragment. */
export function MiniDetails({ compact }: MiniScreenProps) {
  return (
    <div className="mb-mini">
      <h2>{compact ? "Details" : "Example catalogue details"}</h2>
      <p>This screen is synthetic and belongs only to the package example.</p>
      <span className="mb-mini-link">Return to welcome</span>
    </div>
  );
}

/** Miniature depiction of a retired synthetic screen. */
export function MiniFarewell({ compact }: MiniScreenProps) {
  return (
    <div className="mb-mini">
      <h2>{compact ? "Goodbye" : "Goodbye for now"}</h2>
      <p>Sign back in at any time to continue.</p>
      <span className="mb-mini-link">Return to welcome</span>
    </div>
  );
}

interface FrameProps {
  address: string;
  children: ReactNode;
  label?: string;
}

/** Phone device frame around a mobile fragment depiction. */
export function PhoneFrame({ address, children, label }: FrameProps) {
  return (
    <figure style={{ margin: 0 }}>
      {label ? (
        <figcaption className="mb-frame-label">{label}</figcaption>
      ) : null}
      <div className="mb-phone">
        <div className="mb-phone-notch" aria-hidden="true" />
        <p className="mb-frame-label">{address}</p>
        {children}
      </div>
    </figure>
  );
}

/** Browser chrome frame around a desktop fragment depiction. */
export function BrowserFrame({ address, children, label }: FrameProps) {
  return (
    <figure style={{ margin: 0 }} className="mb-pane">
      {label ? (
        <figcaption className="mb-frame-label">{label}</figcaption>
      ) : null}
      <div className="mb-browser">
        <div className="mb-browser-bar">
          <span className="mb-browser-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="mb-browser-address">{address}</span>
        </div>
        {children}
      </div>
    </figure>
  );
}

interface DetailsPanelProps {
  open?: boolean;
}

/** Collapsible metadata panel for the selected catalogue entry. */
export function DetailsPanel({ open }: DetailsPanelProps) {
  return (
    <section className="mb-details">
      <div className="mb-details-bar">
        Details
        <span className="mb-details-hint">
          Description, source, related docs, and use cases
        </span>
      </div>
      {open ? (
        <div className="mb-details-body">
          <div>
            <h3>Description</h3>
            <p>A linked landing screen for the neutral fixture.</p>
          </div>
          <div>
            <h3>Source</h3>
            <p>
              <span className="mb-code">
                examples/basic/entries/catalogue.mockup.tsx
              </span>
            </p>
          </div>
          <div>
            <h3>Fragments</h3>
            <ul>
              <li>
                <span className="mb-code">screens/welcome.mobile.html</span>
              </li>
              <li>
                <span className="mb-code">screens/welcome.desktop.html</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>Related docs</h3>
            <p>
              <span className="mb-chip-link">examples/basic/notes.md</span>
            </p>
          </div>
          <div>
            <h3>Used by</h3>
            <p>
              <span className="mb-chip-link">Example tour</span>
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface FlowStepProps {
  children: ReactNode;
  number: number;
  title: string;
}

/** One ordered use-case step embedding an existing screen. */
export function FlowStep({ children, number, title }: FlowStepProps) {
  return (
    <li className="mb-step">
      <span className="mb-step-num">{number}</span>
      <span className="mb-step-title">{title}</span>
      <span className="mb-step-link">Open standalone screen</span>
      <div className="mb-stage">{children}</div>
    </li>
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
    <div className="mb-empty">
      <h1>{title}</h1>
      <p>
        {body}
        {code ? (
          <>
            {" "}
            <span className="mb-code">{code}</span>
          </>
        ) : null}
      </p>
      <span className="mb-empty-link">{linkLabel}</span>
    </div>
  );
}
