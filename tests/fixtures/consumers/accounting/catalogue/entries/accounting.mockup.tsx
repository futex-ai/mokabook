import React from "react";

import { FirnaCard } from "@firna/ui";
import {
  defineCollection,
  defineScreen,
  defineUseCase,
  MockLink,
  ReviewIgnore,
} from "mokabook";

import { accent } from "../../shared/tokens.js";

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
    </FirnaCard>
  );
}

export const mockups = [
  defineCollection({
    ...common,
    childIds: ["accounting-dashboard", "accounting-campaign"],
    description: "An Accounting-shaped nested catalogue.",
    id: "accounting-fixture",
    navPath: ["Accounting fixture"],
    title: "Accounting fixture",
  }),
  defineScreen({
    ...common,
    description: "A synthetic application dashboard.",
    desktop: <Dashboard compact={false} />,
    id: "accounting-dashboard",
    mobile: <Dashboard compact />,
    navPath: ["Accounting fixture", "Application"],
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
    navPath: ["Accounting fixture", "Marketing"],
    route: "marketing/campaign.html",
    title: "Campaign",
    useCaseIds: ["accounting-tour"],
  }),
  defineUseCase({
    ...common,
    description: "A synthetic cross-style journey.",
    id: "accounting-tour",
    navPath: ["Accounting fixture", "Flows"],
    route: "user-flows/accounting-tour.html",
    steps: [
      { screenId: "accounting-dashboard" },
      { screenId: "accounting-campaign" },
    ],
    title: "Accounting tour",
  }),
];
