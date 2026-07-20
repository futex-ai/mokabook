import type { AnchorHTMLAttributes, ReactNode } from "react";

/** Create an id-addressed link resolved during static generation. */
export function mockLink(id: string): string {
  return `mock:${id}`;
}

/** Anchor props for an id-addressed Mokabook link. */
export interface MockLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
  children?: ReactNode;
  to: string;
}

/** Render a plain anchor addressed by stable registry id. */
export function MockLink({ to, ...props }: MockLinkProps) {
  return <a {...props} href={mockLink(to)} />;
}
