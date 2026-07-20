import type { ReactNode } from "react";

import {
  collection,
  defineCollection,
  defineConfig,
  defineRoot,
  defineScreen,
  defineUseCase,
  MockLink,
  mockLink,
  ReviewIgnore,
  ReviewIgnoreScope,
  reviewMaterialKey,
  screen,
  type CollectionDefinition,
  type CollectionInput,
  type CompatibilityConfig,
  type CompatibilityTransformer,
  type CompatibilityTransformInput,
  type EntryInput,
  type LegacyConfig,
  type LegacyLintConfig,
  type ModuleLoader,
  type ModuleResolutionConfig,
  type MokabookConfig,
  type RegistryDefinition,
  type Renderer,
  type RenderInput,
  type ReviewConfig,
  type RootInput,
  type RoutedEntryInput,
  type ScreenDefinition,
  type ScreenInput,
  type StylesheetRule,
  type UseCaseDefinition,
  type UseCaseInput,
  type UseCaseStep,
  type Viewport,
  type WatchAction,
  type WatchConfig,
  type WatchRule,
} from "mokabook";

const config: MokabookConfig = defineConfig({
  entriesDir: "entries",
  mockupsDir: "mockups",
});
const node: ReactNode = <MockLink to="typed-screen">Typed link</MockLink>;
const definitions: RegistryDefinition[] = [
  defineScreen({
    dependencies: [],
    description: "Type declaration fixture",
    desktop: node,
    id: "typed-screen",
    mobile: <ReviewIgnore id="typed-ignore">{node}</ReviewIgnore>,
    navPath: [],
    relatedDocs: [],
    route: "typed/screen.html",
    title: "Typed screen",
    useCaseIds: [],
  }),
];

void [
  collection,
  defineCollection,
  defineRoot,
  defineUseCase,
  mockLink,
  ReviewIgnoreScope,
  reviewMaterialKey,
  screen,
  config,
  definitions,
];

type PublicTypes =
  | CollectionDefinition
  | CollectionInput
  | CompatibilityConfig
  | CompatibilityTransformInput
  | EntryInput
  | LegacyConfig
  | LegacyLintConfig
  | ModuleLoader
  | ModuleResolutionConfig
  | RegistryDefinition
  | RenderInput
  | ReviewConfig
  | RootInput
  | RoutedEntryInput
  | ScreenDefinition
  | ScreenInput
  | StylesheetRule
  | UseCaseDefinition
  | UseCaseInput
  | UseCaseStep
  | Viewport
  | WatchAction
  | WatchConfig
  | WatchRule;

const renderer: Renderer = (input) =>
  `<html><body>${input.entry.title}</body></html>`;
const compatibilityTransformer: CompatibilityTransformer = (input) =>
  input.content;
const exhaustive:
  PublicTypes | Renderer | CompatibilityTransformer | undefined =
  compatibilityTransformer ?? renderer;
void exhaustive;
