// Route stage renderers for the served Mokabook shell: the framed screen
// stage, ordered use-case flow, legacy-page embed, and quiet empty stage shared
// by home and missing routes. All embedded consumer documents are sandboxed
// without script permission.

import type { ReactNode } from "react";

import { encodeUrlPath } from "../../config/paths.js";
import type { ManifestScreen, ManifestUseCase } from "../../registry/types.js";
import type { Catalogue } from "../catalogue.js";
import { BrowserFrame, PhoneFrame } from "./frames.js";
import type { RouteTarget } from "./target.js";

function EmbedStage(props: { route: string; title: string }) {
  return (
    <div className="mbk-stage-embed" data-mokabook-scroll="embed">
      <iframe
        className="mbk-frag"
        sandbox=""
        src={`/static/${encodeUrlPath(props.route)}`}
        title={props.title}
      />
    </div>
  );
}

function FramesStage(props: { screen: ManifestScreen }) {
  const screen = props.screen;
  const address = screen.address ?? screen.route;
  return (
    <div
      className="mbk-stage mbk-live"
      data-mokabook-scroll="stage"
      data-mokabook-stage=""
      data-viewport="both"
    >
      <div className="mbk-frame-wrap mbk-frame-mobile">
        <p className="mbk-frame-label">Mobile</p>
        <PhoneFrame>
          <iframe
            className="mbk-frag"
            sandbox=""
            src={`/static/${encodeUrlPath(screen.fragments.mobile)}`}
            title={`${screen.title} — mobile`}
          />
        </PhoneFrame>
      </div>
      <div className="mbk-frame-wrap mbk-frame-desktop">
        <p className="mbk-frame-label">Desktop</p>
        <BrowserFrame address={address}>
          <iframe
            className="mbk-frag"
            sandbox=""
            src={`/static/${encodeUrlPath(screen.fragments.desktop)}`}
            title={`${screen.title} — desktop`}
          />
        </BrowserFrame>
      </div>
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
                <div className="mbk-flow-screen">
                  <BrowserFrame address={screen.address ?? screen.route}>
                    <iframe
                      className="mbk-frag"
                      sandbox=""
                      src={`/static/${encodeUrlPath(screen.fragments.desktop)}`}
                      title={`${screen.title} — desktop`}
                    />
                  </BrowserFrame>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Quiet state used by home and missing routes. */
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
    <FramesStage screen={entry} />
  ) : (
    <UseCaseFlowStage catalogue={props.catalogue} entry={entry} />
  );
}
