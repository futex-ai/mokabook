import type { ReactNode } from "react";

/** Eyebrow, page heading and optional lead shared by every document page. */
export function DocumentIntro({
  eyebrow,
  lead,
  title,
}: {
  eyebrow: string;
  lead?: string;
  title: ReactNode;
}) {
  return (
    <div className="site-document-intro">
      <p className="site-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {lead === undefined ? null : <p className="site-lead">{lead}</p>}
    </div>
  );
}

/** The readable document page used by the changelog and the policies. */
export function SiteDocument({
  children,
  eyebrow,
  lead,
  policy = false,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  lead?: string;
  policy?: boolean;
  title: ReactNode;
}) {
  return (
    <main
      className={policy ? "site-document site-policy" : "site-document"}
      id="main"
    >
      <DocumentIntro
        eyebrow={eyebrow}
        title={title}
        {...(lead === undefined ? {} : { lead })}
      />
      {children}
    </main>
  );
}
