import { BrandMark, Icon } from "./icons.js";

export const repositoryUrl = "https://github.com/mokly-ai/mokly";
export const docsUrl = `${repositoryUrl}#use-mokabook`;

export function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Mokly home">
      <BrandMark />
      <span>
        mokly<span className="brand-period">.</span>
      </span>
    </a>
  );
}

export function Navigation({
  action = "Get started",
  section = "The workflow",
}: {
  action?: string;
  section?: string;
}) {
  return (
    <header className="site-header wrap">
      <Brand />
      <nav className="desktop-nav" aria-label="Main navigation">
        <a href="#workflow">{section}</a>
        <a href="#foundation">Open source</a>
        <a href={docsUrl}>
          Docs <span aria-hidden="true">↗</span>
        </a>
      </nav>
      <a className="nav-cta" href={docsUrl}>
        {action}
        <Icon name="arrow" />
      </a>
      <details className="mobile-nav">
        <summary aria-label="Open navigation">
          <Icon name="menu" />
        </summary>
        <nav aria-label="Mobile navigation">
          <a href="#workflow">{section}</a>
          <a href="#foundation">Open source</a>
          <a href={docsUrl}>Read the docs</a>
        </nav>
      </details>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer wrap">
      <Brand />
      <p>A shared picture. A better product.</p>
      <nav aria-label="Footer navigation">
        <a href={repositoryUrl}>GitHub ↗</a>
        <a href={docsUrl}>Documentation ↗</a>
      </nav>
    </footer>
  );
}

export function InstallCommand() {
  const command = "npm install --save-dev mokabook react react-dom";
  return (
    <div className="install">
      <div>
        <span className="eyebrow">Start in your repository</span>
        <code>{command}</code>
      </div>
      <button
        type="button"
        data-copy={command}
        aria-label="Copy install command"
      >
        <Icon name="copy" />
        <span data-copy-label>Copy</span>
      </button>
      <span className="sr-only" role="status" data-copy-status />
    </div>
  );
}

export function ArrowLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: string;
  secondary?: boolean;
}) {
  return (
    <a
      className={`button ${secondary ? "button-secondary" : "button-primary"}`}
      href={href}
    >
      {children}
      <Icon name="arrow" />
    </a>
  );
}
