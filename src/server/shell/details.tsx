// The served collapsible details inspector: a native <details> bar above a
// two-column body with prose on the left and metadata rows on the right —
// populated from the manifest entry for the selected route: description,
// rationale, source and generated paths, related docs, dependencies, and the
// use cases a screen belongs to.

import type { ReactNode } from "react";

import { encodeUrlPath } from "../../config/paths.js";
import type { ManifestUseCase } from "../../registry/types.js";
import type { Catalogue } from "../catalogue.js";
import { ChevronIcon, FlowIcon } from "./icons.js";
import type { RoutedEntry, RouteTarget } from "./target.js";

function MetaRow(props: { children: ReactNode; label: string }) {
  return (
    <div className="mbk-meta-row">
      <span className="mbk-meta-k">{props.label}</span>
      <span className="mbk-meta-v">{props.children}</span>
    </div>
  );
}

function PathChips(props: { values: readonly string[] }) {
  return (
    <span className="mbk-chips">
      {props.values.map((value) => (
        <code className="mbk-code" key={value}>
          {value}
        </code>
      ))}
    </span>
  );
}

function UsedByChips(props: {
  catalogue: Catalogue;
  useCaseIds: readonly string[];
}) {
  const useCases = props.useCaseIds
    .map((id) => props.catalogue.byId.get(id))
    .filter(
      (entry): entry is ManifestUseCase =>
        entry !== undefined && entry.kind === "use-case",
    );
  if (useCases.length === 0) {
    return null;
  }
  return (
    <MetaRow label="Used by">
      <span className="mbk-chips">
        {useCases.map((useCase) => (
          <a
            className="mbk-chip flow"
            href={`/view/${encodeUrlPath(useCase.route)}`}
            key={useCase.id}
          >
            <FlowIcon size={11} />
            {useCase.title}
          </a>
        ))}
      </span>
    </MetaRow>
  );
}

function EntryDetailsBody(props: { catalogue: Catalogue; entry: RoutedEntry }) {
  const entry = props.entry;
  return (
    <div className="mbk-details-body">
      <div>
        <p className="mbk-details-desc">{entry.description}</p>
        {entry.rationale ? (
          <p className="mbk-details-rationale">
            <span className="k">
              Why this {entry.kind === "use-case" ? "flow" : "screen"} —{" "}
            </span>
            {entry.rationale}
          </p>
        ) : null}
      </div>
      <div className="mbk-meta">
        <MetaRow label="Source">
          <code className="mbk-code">{entry.sourcePath}</code>
        </MetaRow>
        {entry.kind === "screen" ? (
          <MetaRow label="Generated">
            <PathChips
              values={[entry.fragments.mobile, entry.fragments.desktop]}
            />
          </MetaRow>
        ) : null}
        {entry.relatedDocs.length > 0 ? (
          <MetaRow label="Related docs">
            <PathChips values={entry.relatedDocs} />
          </MetaRow>
        ) : null}
        {entry.dependencies.length > 0 ? (
          <MetaRow label="Dependencies">
            <PathChips values={entry.dependencies} />
          </MetaRow>
        ) : null}
        {entry.kind === "screen" ? (
          <UsedByChips
            catalogue={props.catalogue}
            useCaseIds={entry.useCaseIds}
          />
        ) : null}
      </div>
    </div>
  );
}

function LegacyDetailsBody(props: { sourcePath: string }) {
  return (
    <div className="mbk-details-body">
      <div>
        <p className="mbk-details-desc">
          A catalogue page that has not moved to the structured registry yet, so
          it may show several screen states. It is browsed here exactly as the
          generated page renders.
        </p>
      </div>
      <div className="mbk-meta">
        <MetaRow label="Source">
          <code className="mbk-code">{props.sourcePath}</code>
        </MetaRow>
      </div>
    </div>
  );
}

/** The collapsible details panel for the selected route. */
export function DetailsPanel(props: {
  catalogue: Catalogue;
  target: RouteTarget;
}) {
  return (
    <details className="mbk-details" data-mokabook-details="" open>
      <summary className="mbk-details-bar">
        <span className="chev">
          <ChevronIcon size={12} />
        </span>
        Details
        <span className="mbk-details-hint">
          Description, rationale, source, related docs, and use cases
        </span>
      </summary>
      {props.target.kind === "entry" ? (
        <EntryDetailsBody
          catalogue={props.catalogue}
          entry={props.target.entry}
        />
      ) : (
        <LegacyDetailsBody sourcePath={props.target.page.sourcePath} />
      )}
    </details>
  );
}
