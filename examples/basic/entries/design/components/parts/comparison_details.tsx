import { MockLink } from "@mokly/mokly";

import { useDesignInstance } from "../../library/composition.js";
import { changeStatusBadge } from "../../library/controls/change-status.js";
import { MetaRow } from "../../parts/metadata_row.js";

import type { ChangeStatus, ComparisonFixture } from "./comparison_fixtures.js";

export function ChangeStatusBadge({ status }: { status: ChangeStatus }) {
  return (
    <changeStatusBadge.Component
      moklyInstance={useDesignInstance("status")}
      status={status}
    />
  );
}

/** Factual evidence belongs to the inspector, with no generated visual narrative. */
export function ComparisonDetails({
  comparison,
}: {
  comparison?: ComparisonFixture | undefined;
}) {
  if (!comparison) return null;
  const prop = comparison.propChange;
  const reasons = {
    output: "Rendered output changed",
    inputs: "Supplied props changed",
    added: "Added since the comparison baseline",
    removed: "Removed since the comparison baseline",
    "variant-removed": "Saved variant removed",
  } as const;
  return (
    <section className="ce-comparison-evidence" aria-label="Comparison details">
      <h3>Comparison details</h3>
      <p className="ce-muted">Compared with the branch point on origin/main.</p>
      <dl className="ce-props">
        <MetaRow name="change" label="Change" presentation="props">
          {reasons[comparison.reason]}
        </MetaRow>
        {comparison.variant ? (
          <MetaRow
            name="saved-variant"
            label="Saved variant"
            presentation="props"
          >
            {comparison.variant}
          </MetaRow>
        ) : null}
        {comparison.savedPropsUnchanged ? (
          <MetaRow name="saved-props" label="Saved props" presentation="props">
            Unchanged
          </MetaRow>
        ) : null}
      </dl>
      {prop ? (
        <>
          <h4>{prop.instance}</h4>
          <table className="ce-prop-comparison" aria-label="Changed props">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Before</th>
                <th>Current</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <code>{prop.prop}</code>
                </th>
                <td>
                  <code>{JSON.stringify(prop.before)}</code>
                </td>
                <td>
                  <code>{JSON.stringify(prop.after)}</code>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}
      {comparison.changedComponents?.length ? (
        <>
          <h4>Changed components used here</h4>
          <ul className="ce-usage-list">
            {comparison.changedComponents.map((component) => (
              <li key={component.to}>
                <MockLink to={component.to}>{component.title}</MockLink>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
