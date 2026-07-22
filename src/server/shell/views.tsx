// Route-owned main-region rendering for the persistent Mokabook shell: the
// home, missing-route, review-launcher, and target views, plus the title and
// active-route helpers the document scaffold and progressive navigation use.

import type { Catalogue } from "../catalogue.js";
import type { ShellContext } from "./context.js";
import { DetailsPanel } from "./details.js";
import { ScreenHead, targetHead, ViewportSwitch } from "./head.js";
import { EmptyStage, TargetStage } from "./stages.js";
import type { RouteTarget } from "./target.js";

/** One renderable Mokabook shell state. */
export type ShellView =
  | { kind: "home" }
  | { kind: "missing"; requested: string }
  | { kind: "review" }
  | { kind: "target"; target: RouteTarget };

function TargetView(props: { catalogue: Catalogue; target: RouteTarget }) {
  const head = targetHead(props.catalogue, props.target);
  return (
    <>
      <ScreenHead
        action={
          props.target.kind === "entry" &&
          props.target.entry.kind === "screen" ? (
            <ViewportSwitch />
          ) : null
        }
        crumbs={head.crumbs}
        heading={head.title}
        id={head.id}
      />
      <TargetStage
        catalogue={props.catalogue}
        legacyTitle={head.title}
        target={props.target}
      />
      <DetailsPanel catalogue={props.catalogue} target={props.target} />
    </>
  );
}

function HomeView(props: { catalogue: Catalogue }) {
  const entries = props.catalogue.manifest.entries;
  const screens = entries.filter((entry) => entry.kind === "screen").length;
  const useCases = entries.filter((entry) => entry.kind === "use-case").length;
  const pages = props.catalogue.manifest.legacyPages.length;
  return (
    <EmptyStage heading="Mokabook">
      <p>
        Browse the mockup catalogue: expand folders and choose a screen or user
        flow from the navigation.
      </p>
      <p className="mbk-empty-note">
        {screens} structured screen{screens === 1 ? "" : "s"} · {useCases} user
        flow{useCases === 1 ? "" : "s"} · {pages} catalogue page
        {pages === 1 ? "" : "s"}
      </p>
    </EmptyStage>
  );
}

function MissingView(props: { requested: string }) {
  return (
    <EmptyStage heading="Screen not found">
      <p>
        Nothing in the catalogue matches <code>{props.requested}</code>. It may
        have been renamed or removed — choose a screen from the navigation
        instead.
      </p>
      <p className="mbk-empty-note">
        If a screen was just added, rebuild the catalogue with{" "}
        <code>mokabook build</code>.
      </p>
      <a className="mbk-empty-link" href="/">
        Go to the catalogue home
      </a>
    </EmptyStage>
  );
}

function ReviewLauncherView(props: { base: string }) {
  return (
    <>
      <p className="mbk-basewatch">
        <span aria-hidden="true" className="mbk-basewatch-dot" />
        Comparing this branch with <strong>{props.base}</strong>
      </p>
      <EmptyStage heading="Mokabook review">
        <p>
          Generate the static comparison for this branch, then open its report:
        </p>
        <p>
          <code className="mbk-code">mokabook review --base {props.base}</code>
        </p>
        <a className="mbk-empty-link" href="/">
          Browse the catalogue
        </a>
      </EmptyStage>
    </>
  );
}

/** The active catalogue route for a shell view, when it has one. */
export function activeRouteForView(view: ShellView): string | undefined {
  if (view.kind !== "target") {
    return undefined;
  }
  return view.target.kind === "entry"
    ? view.target.entry.route
    : view.target.page.route;
}

/** The browser document title for a shell view. */
export function viewTitle(catalogue: Catalogue, view: ShellView): string {
  if (view.kind === "home") {
    return "Mokabook";
  }
  if (view.kind === "missing") {
    return "Not found · Mokabook";
  }
  if (view.kind === "review") {
    return "Review · Mokabook";
  }
  return `${targetHead(catalogue, view.target).title} · Mokabook`;
}

/** Render the only region replaced by client-side Browse navigation. */
export function ShellMain(props: {
  catalogue: Catalogue;
  context: ShellContext;
  view: ShellView;
}) {
  return (
    <main className="mbk-main" data-mokabook-view="" id="mb-main" tabIndex={-1}>
      {props.view.kind === "home" ? (
        <HomeView catalogue={props.catalogue} />
      ) : null}
      {props.view.kind === "missing" ? (
        <MissingView requested={props.view.requested} />
      ) : null}
      {props.view.kind === "review" ? (
        <ReviewLauncherView base={props.context.base} />
      ) : null}
      {props.view.kind === "target" ? (
        <TargetView catalogue={props.catalogue} target={props.view.target} />
      ) : null}
    </main>
  );
}
