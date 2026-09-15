import { FirnaButton, FirnaCard } from "@firna/ui";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  definePage,
  defineCollection,
  defineScreen,
  defineUseCase,
  MockLink,
  ReviewIgnore,
} from "@mokly/mokly";

import { accent } from "../../shared/tokens.js";
import { renderComponent } from "../legacy/components.js";

const common = {
  dependencies: ["packages/firna-ui/index.tsx", "shared/tokens.ts"],
  relatedDocs: ["docs/catalogue.md"],
};

function Dashboard({ compact }: { compact: boolean }) {
  return (
    <FirnaCard accent={accent} compact={compact}>
      <ReviewIgnore id="consumer-navigation">
        <nav>Application navigation</nav>
      </ReviewIgnore>
      <h1>Accounts overview</h1>
      <MockLink to="accounting-campaign">View campaign</MockLink>
      <MockLink asChild to="accounting-campaign">
        <FirnaButton>Open campaign</FirnaButton>
      </MockLink>
    </FirnaCard>
  );
}

export const mockups = [
  definePage({
    ...common,
    id: "accounting-notice",
    title: "Notice",
    description: "A complete consumer-composed document.",
    route: "archive/legacy-notice.html",
    render: () =>
      "<!doctype html>" +
      renderToStaticMarkup(
        <html lang="en">
          <body>
            {renderComponent("notice", { label: "Expanded legacy notice" })}
          </body>
        </html>,
      ),
  }),
  defineCollection({
    ...common,
    childIds: ["accounting-tour"],
    description: "Synthetic Accounting user flows.",
    id: "accounting-flows",
    title: "Flows",
  }),
  defineCollection({
    ...common,
    childIds: [
      "accounting-dashboard",
      "accounting-campaign",
      "accounting-notice",
    ],
    description: "An Accounting-shaped nested catalogue.",
    id: "accounting-fixture",
    title: "Accounting fixture",
  }),
  defineScreen({
    ...common,
    description: "A synthetic application dashboard.",
    desktop: <Dashboard compact={false} />,
    id: "accounting-dashboard",
    mobile: <Dashboard compact />,
    route: "app/dashboard.html",
    title: "Accounts overview",
    useCaseIds: ["accounting-tour"],
  }),
  defineScreen({
    ...common,
    description: "A synthetic marketing route with separate styling.",
    desktop: <main data-campaign="desktop">Campaign desktop</main>,
    id: "accounting-campaign",
    mobile: <main data-campaign="mobile">Campaign mobile</main>,
    route: "marketing/campaign.html",
    title: "Campaign",
    useCaseIds: ["accounting-tour"],
  }),
  defineUseCase({
    ...common,
    description: "A synthetic cross-style journey.",
    id: "accounting-tour",
    route: "user-flows/accounting-tour.html",
    steps: [
      { screenId: "accounting-dashboard" },
      { screenId: "accounting-campaign" },
    ],
    title: "Accounting tour",
  }),
];
