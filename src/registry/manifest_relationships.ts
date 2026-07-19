import { MokabookError } from "../errors.js";

/** Validate manifest relationship targets and reciprocal memberships. */
export function validateManifestRelationships(
  entries: readonly Record<string, unknown>[],
  byId: ReadonlyMap<string, Record<string, unknown>>,
): void {
  for (const entry of entries) {
    if (entry.kind === "collection") validateCollection(entry, byId);
    else if (entry.kind === "screen") validateScreen(entry, byId);
    else validateUseCase(entry, byId);
  }
}

function validateCollection(
  entry: Record<string, unknown>,
  byId: ReadonlyMap<string, Record<string, unknown>>,
): void {
  for (const childId of entry.childIds as string[]) {
    if (!byId.has(childId))
      relationshipError(entry, `unknown child ${childId}`);
  }
}

function validateScreen(
  entry: Record<string, unknown>,
  byId: ReadonlyMap<string, Record<string, unknown>>,
): void {
  for (const useCaseId of entry.useCaseIds as string[]) {
    const useCase = byId.get(useCaseId);
    if (useCase?.kind !== "use-case") {
      relationshipError(
        entry,
        `use-case target is not a use case: ${useCaseId}`,
      );
    }
    const steps = useCase.steps as Array<Record<string, unknown>>;
    if (!steps.some((step) => step.screenId === entry.id)) {
      relationshipError(
        entry,
        `use case ${useCaseId} does not reference this screen`,
      );
    }
  }
}

function validateUseCase(
  entry: Record<string, unknown>,
  byId: ReadonlyMap<string, Record<string, unknown>>,
): void {
  for (const step of entry.steps as Array<Record<string, unknown>>) {
    const screenId = step.screenId as string;
    const screen = byId.get(screenId);
    if (screen?.kind !== "screen") {
      relationshipError(entry, `step target is not a screen: ${screenId}`);
    }
    if (!(screen.useCaseIds as string[]).includes(entry.id as string)) {
      relationshipError(
        entry,
        `screen ${screenId} does not list this use case`,
      );
    }
  }
}

function relationshipError(
  entry: Record<string, unknown>,
  detail: string,
): never {
  throw new MokabookError(
    "manifest-invalid",
    `${String(entry.id)} has an invalid relationship: ${detail}`,
  );
}
