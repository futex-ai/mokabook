import type { AnchorHTMLAttributes, ReactNode } from "react";

import { isCatalogueId, isLogicalFragment } from "../navigation/logical.js";

/** Create an id-addressed link resolved during static generation. */
export function mockLink(id: string, fragment?: string): string {
  if (!isCatalogueId(id)) {
    throw new TypeError("mockLink expected kebab-case catalogue id");
  }
  if (fragment !== undefined && !isLogicalFragment(fragment)) {
    throw new TypeError("mockLink fragment must be a bare HTML id");
  }
  return `mock:${id}${fragment ? `#${fragment}` : ""}`;
}

/** Anchor props for an id-addressed Mokabook link. */
export interface MockLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
  children?: ReactNode;
  fragment?: string;
  to: string;
}

/** Render a plain anchor addressed by stable registry id. */
export function MockLink({ fragment, to, ...props }: MockLinkProps) {
  return <a {...props} href={mockLink(to, fragment)} />;
}
