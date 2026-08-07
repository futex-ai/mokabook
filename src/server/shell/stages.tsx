// Route stage renderers for the served Mokabook shell: the framed screen
// stage, ordered use-case flow, legacy-page embed, and quiet empty stage shared
// by home and missing routes. All embedded consumer documents are sandboxed
// without script permission.

import type { ReactNode } from "react";

import type { Viewport } from "../../authoring/types.js";
import { encodeUrlPath } from "../../config/paths.js";
import type { ManifestScreen, ManifestUseCase } from "../../registry/types.js";
import type { Catalogue } from "../catalogue.js";
import { BrowserFrame, PhoneFrame } from "./frames.js";
import type { RouteTarget } from "./target.js";

/** Served URLs a frame swaps between; both absent in a light-only catalogue. */
interface FragmentSources {
  dark: string | undefined;
  light: string | undefined;
}

/**
 * The served URL of one generated route. Every embedded frame — its `src` and
 * the scheme attributes the Browse client assigns back into that `src` — is
 * built here so the two can never drift apart.
 */
function fragmentSrc(route: string): string {
  return `/static/${encodeUrlPath(route)}`;
}

function fragmentSources(
  screen: ManifestScreen,
  viewport: Viewport,
  hasDarkFragments: boolean,
): FragmentSources {
  if (!hasDarkFragments) {
    return { dark: undefined, light: undefined };
  }
  const dark = screen.darkFragments?.[viewport];
  return {
    dark: dark === undefined ? undefined : fragmentSrc(dark),
    light: fragmentSrc(screen.fragments[viewport]),
  };
}

/** Whether the screen keeps its light render under a dark selection. */
function isSchemeFallback(
  screen: ManifestScreen,
  hasDarkFragments: boolean,
): boolean {
  return hasDarkFragments && screen.darkFragments === undefined;
}

function FrameLabel(props: { fallback: boolean; text: string }) {
  return (
    <p className="mbk-frame-label">
      {props.text}
      {props.fallback ? (
        <span className="mbk-frame-scheme-note">{" — Light only"}</span>
      ) : null}
    </p>
  );
}

function EmbedStage(props: { route: string; title: string }) {
  return (
    <div className="mbk-stage-embed" data-mokabook-scroll="embed">
      <iframe
        className="mbk-frag"
        sandbox=""
        src={fragmentSrc(props.route)}
        title={props.title}
      />
    </div>
  );
}

function FramesStage(props: {
  hasDarkFragments: boolean;
  screen: ManifestScreen;
}) {
  const screen = props.screen;
  const address = screen.address ?? screen.route;
  const mobile = fragmentSources(screen, "mobile", props.hasDarkFragments);
  const desktop = fragmentSources(screen, "desktop", props.hasDarkFragments);
  const fallback = isSchemeFallback(screen, props.hasDarkFragments);
  return (
    <div
      className="mbk-stage mbk-live"
      data-mokabook-scroll="stage"
      data-mokabook-stage=""
      data-viewport="both"
    >
      <div
        className="mbk-frame-wrap mbk-frame-mobile"
        data-color-scheme-fallback={fallback ? "" : undefined}
      >
        <FrameLabel fallback={fallback} text="Mobile" />
        <PhoneFrame>
          <iframe
            className="mbk-frag"
            data-fragment-dark={mobile.dark}
            data-fragment-light={mobile.light}
            sandbox=""
            src={fragmentSrc(screen.fragments.mobile)}
            title={`${screen.title} — mobile`}
          />
        </PhoneFrame>
      </div>
      <div
        className="mbk-frame-wrap mbk-frame-desktop"
        data-color-scheme-fallback={fallback ? "" : undefined}
      >
        <FrameLabel fallback={fallback} text="Desktop" />
        <BrowserFrame address={address}>
          <iframe
            className="mbk-frag"
            data-fragment-dark={desktop.dark}
            data-fragment-light={desktop.light}
            sandbox=""
            src={fragmentSrc(screen.fragments.desktop)}
            title={`${screen.title} — desktop`}
          />
        </BrowserFrame>
      </div>
    </div>
  );
}

function FlowScreen(props: {
  hasDarkFragments: boolean;
  screen: ManifestScreen;
}) {
  const screen = props.screen;
  const desktop = fragmentSources(screen, "desktop", props.hasDarkFragments);
  const fallback = isSchemeFallback(screen, props.hasDarkFragments);
  return (
    <div
      className="mbk-flow-screen"
      data-color-scheme-fallback={fallback ? "" : undefined}
    >
      <BrowserFrame address={screen.address ?? screen.route}>
        <iframe
          className="mbk-frag"
          data-fragment-dark={desktop.dark}
          data-fragment-light={desktop.light}
          sandbox=""
          src={fragmentSrc(screen.fragments.desktop)}
          title={`${screen.title} — desktop`}
        />
      </BrowserFrame>
    </div>
  );
}

function UseCaseFlowStage(props: {
  catalogue: Catalogue;
  entry: ManifestUseCase;
}) {
  return (
    <div className="mbk-flow" data-mokabook-scroll="flow">
      <div className="flow-track">
        {props.entry.steps.map((step, index) => {
          const candidate = props.catalogue.byId.get(step.screenId);
          const screen = candidate?.kind === "screen" ? candidate : undefined;
          return (
            <section className="flow-step" key={`${step.screenId}-${index}`}>
              <div className="flow-step-head">
                <span className="flow-step-num">{index + 1}</span>
                <div>
                  <h3>{step.title ?? screen?.title ?? step.screenId}</h3>
                  <p>{step.description ?? screen?.description}</p>
                  {screen ? (
                    <a
                      className="flow-step-link"
                      href={`/view/${encodeUrlPath(screen.route)}`}
                    >
                      This screen in the catalogue: {screen.title} →
                    </a>
                  ) : null}
                </div>
              </div>
              {screen ? (
                <FlowScreen
                  hasDarkFragments={props.catalogue.hasDarkFragments}
                  screen={screen}
                />
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Quiet state used by home, missing routes, and the review launcher. */
export function EmptyStage(props: { children: ReactNode; heading: string }) {
  return (
    <div className="mbk-empty">
      <h2>{props.heading}</h2>
      {props.children}
    </div>
  );
}

/** Render the route-specific preview below the shell-owned heading. */
export function TargetStage(props: {
  catalogue: Catalogue;
  legacyTitle: string;
  target: RouteTarget;
}) {
  if (props.target.kind === "legacy") {
    return (
      <EmbedStage route={props.target.page.route} title={props.legacyTitle} />
    );
  }
  const entry = props.target.entry;
  return entry.kind === "screen" ? (
    <FramesStage
      hasDarkFragments={props.catalogue.hasDarkFragments}
      screen={entry}
    />
  ) : (
    <UseCaseFlowStage catalogue={props.catalogue} entry={entry} />
  );
}
