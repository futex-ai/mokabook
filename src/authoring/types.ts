import type { ReactNode } from "react";

/** Mobile or desktop rendering target. */
export type Viewport = "desktop" | "mobile";

/** Metadata shared by all structured catalogue entries. */
export interface EntryInput {
  dependencies: readonly string[];
  description: string;
  id: string;
  navPath: readonly string[];
  rationale?: string;
  relatedDocs: readonly string[];
  title: string;
}

/** Metadata shared by entries that own a route. */
export interface RoutedEntryInput extends EntryInput {
  route: string;
}

/** One screen with distinct mobile and desktop renders. */
export interface ScreenInput extends RoutedEntryInput {
  address?: string;
  desktop: ReactNode;
  mobile: ReactNode;
  useCaseIds?: readonly string[];
}

/** A structural navigation collection. */
export interface CollectionInput extends EntryInput {
  childIds: readonly string[];
}

/** One canonical screen reference in an ordered use case. */
export interface UseCaseStep {
  description?: string;
  screenId: string;
  title?: string;
}

/** A journey composed from existing screens. */
export interface UseCaseInput extends RoutedEntryInput {
  steps: readonly UseCaseStep[];
}

interface DefinitionBrand {
  readonly __viaDefine: true;
  definedIn?: string;
}

/** Validated screen definition created by `defineScreen`. */
export interface ScreenDefinition extends ScreenInput, DefinitionBrand {
  kind: "screen";
  useCaseIds: readonly string[];
}

/** Validated collection definition created by `defineCollection`. */
export interface CollectionDefinition extends CollectionInput, DefinitionBrand {
  kind: "collection";
}

/** Validated use-case definition created by `defineUseCase`. */
export interface UseCaseDefinition extends UseCaseInput, DefinitionBrand {
  kind: "use-case";
}

/** Any structured catalogue definition. */
export type RegistryDefinition =
  ScreenDefinition | CollectionDefinition | UseCaseDefinition;

/** Fields inherited by a nested child from its ancestors. */
export interface NestedInherited {
  address?: string;
  dependencies?: readonly string[];
  relatedDocs?: readonly string[];
}

/** A screen in a nested definition tree. */
export interface NestedScreenInput extends NestedInherited {
  description: string;
  desktop: ReactNode;
  id: string;
  mobile: ReactNode;
  rationale?: string;
  slug: string;
  title: string;
  useCaseIds?: readonly string[];
}

/** A collection in a nested definition tree. */
export interface NestedCollectionInput extends NestedInherited {
  children: readonly NestedChild[];
  description: string;
  id: string;
  rationale?: string;
  segment: string;
  title: string;
}

/** Root collection metadata for a nested definition tree. */
export interface RootCollectionInput extends NestedInherited {
  description: string;
  id: string;
  rationale?: string;
}

/** Root position and children for a nested definition tree. */
export interface RootInput {
  children: readonly NestedChild[];
  collection?: RootCollectionInput;
  navPath: readonly string[];
  path: string;
  title: string;
}

/** Marker returned by `screen` for nested composition. */
export interface NestedScreenMarker extends NestedScreenInput {
  __nested: "screen";
  definedIn?: string;
}

/** Marker returned by `collection` for nested composition. */
export interface NestedCollectionMarker extends NestedCollectionInput {
  __nested: "collection";
  definedIn?: string;
}

/** A nested screen or collection. */
export type NestedChild = NestedScreenMarker | NestedCollectionMarker;

/** A definition annotated with its authored source module. */
export type ResolvedRegistryEntry = RegistryDefinition & {
  sourcePath: string;
  sourceRelativePath: string;
};
