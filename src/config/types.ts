/** Filesystem changes understood by the watched development runtime. */
export type WatchAction = "ignore" | "rebuild" | "reload" | "restart";

/** One glob-to-stylesheet mapping evaluated in declaration order. */
export interface StylesheetRule {
  /** POSIX glob matched against a screen or legacy route. */
  match: string;
  /** Paths relative to `mockupsDir`, or absolute HTTP(S) URLs. */
  stylesheets: readonly string[];
}

/** Exact template-variable references trusted for matching generated routes. */
export interface TrustedTemplateVariableRule {
  /** POSIX glob matched against a generated HTML route. */
  match: string;
  /** Mustache variable names accepted as complete URL values. */
  variables: readonly string[];
}

/** Explicit exceptions for links resolved after Mokabook generation. */
export interface LinkValidationConfig {
  /** Route-scoped Mustache variables that bypass local-target validation. */
  trustedTemplateVariables?: readonly TrustedTemplateVariableRule[];
}

/** Optional support for pre-registry source pages during consumer migration. */
export interface LegacyConfig {
  /** Config-relative source directory containing legacy source pages. */
  pagesDir: string;
  /** Source-relative globs omitted during a staged consumer migration. */
  exclude?: readonly string[];
  /** Optional config-relative module exporting a legacy component renderer. */
  components?: string;
  /** Explicit source-relative output route replacements. */
  routeAliases?: Readonly<Record<string, string>>;
  /** Optional route-level lint policy. No Accounting policy is implicit. */
  lint?: LegacyLintConfig;
}

/** Opt-in generic lints for legacy documents. */
export interface LegacyLintConfig {
  /** Routes exempt from the screen-count cap. */
  allowRoutes?: readonly string[];
  /** Maximum `data-mokabook-screen` markers in one document. */
  maxScreensPerPage?: number;
  /** Require ids on elements carrying `data-mokabook-stage`. */
  requireStageIds?: boolean;
}

/** One additional consumer watch input. */
export interface WatchRule {
  action: WatchAction;
  /** Repository-relative POSIX globs. */
  paths: readonly string[];
}

/** Watched-development behavior. */
export interface WatchConfig {
  /** Debounce window applied to a burst of filesystem notifications. */
  debounceMs?: number;
  /** Additional classified consumer inputs. */
  rules?: readonly WatchRule[];
}

/** Git comparison and artifact configuration. */
export interface ReviewConfig {
  /** Default Git ref used by `mokabook review`. */
  base?: string;
  /** Config-relative artifact directory. */
  outDir?: string;
  /** Repository-relative POSIX globs whose changes can affect many screens. */
  sharedImpact?: readonly string[];
}

/** Temporary compatibility accepted during a consumer cutover. */
export interface CompatibilityConfig {
  /** Read legacy v2 output only when the canonical v3 manifest is absent. */
  readManifestV2?: boolean;
  /** Config-relative module applying a temporary deterministic document bridge. */
  transformer?: string;
}

/** Esbuild loaders allowed for consumer-authored module extensions. */
export type ModuleLoader =
  | "base64"
  | "binary"
  | "css"
  | "dataurl"
  | "empty"
  | "file"
  | "js"
  | "json"
  | "jsx"
  | "text"
  | "ts"
  | "tsx";

/** Consumer-owned module resolution needed by cross-platform component trees. */
export interface ModuleResolutionConfig {
  /** Bare module aliases applied while bundling entries and renderers. */
  aliases?: Readonly<Record<string, string>>;
  /** Export conditions evaluated in declaration order. */
  conditions?: readonly string[];
  /** Extension-to-loader overrides for consumer modules. */
  loaders?: Readonly<Record<string, ModuleLoader>>;
  /** Package fields evaluated in declaration order. */
  mainFields?: readonly string[];
  /** Config-relative package roots whose node_modules directories are searched. */
  packageRoots?: readonly string[];
  /** Module extensions evaluated in declaration order. */
  resolveExtensions?: readonly string[];
}

/** Public, serializable host configuration. */
export interface MokabookConfig {
  /** Config-relative structured mockup source directory. */
  entriesDir: string;
  /** Config-relative generated catalogue/output root. */
  mockupsDir: string;
  /** Config-relative repository root; defaults to the config directory. */
  repoRoot?: string;
  /** Optional config-relative consumer renderer module. */
  renderer?: string;
  /** Optional consumer-specific module resolution for cross-platform sources. */
  moduleResolution?: ModuleResolutionConfig;
  /** Explicit route-scoped exceptions for dynamic link values. */
  linkValidation?: LinkValidationConfig;
  /** Ordered route-to-stylesheet mappings. */
  stylesheets?: readonly StylesheetRule[];
  /** Optional legacy source support. */
  legacy?: LegacyConfig;
  /** Review settings. */
  review?: ReviewConfig;
  /** Watch settings. */
  watch?: WatchConfig;
  /** Temporary manifest compatibility. */
  compatibility?: CompatibilityConfig;
}

/** Absolute, validated configuration consumed by runtime engines. */
export interface ResolvedConfig {
  compatibility: {
    readManifestV2: boolean;
    transformer?: string;
  };
  configPath: string;
  entriesDir: string;
  legacy?: ResolvedLegacyConfig;
  linkValidation: Required<LinkValidationConfig>;
  mockupsDir: string;
  moduleResolution: ResolvedModuleResolutionConfig;
  renderer?: string;
  repoRoot: string;
  review: Required<ReviewConfig>;
  stylesheets: readonly StylesheetRule[];
  watch: Required<Pick<WatchConfig, "debounceMs">> & {
    rules: readonly WatchRule[];
  };
}

/** Validated module resolution with absolute package roots. */
export interface ResolvedModuleResolutionConfig {
  aliases: Readonly<Record<string, string>>;
  conditions?: readonly string[];
  loaders: Readonly<Record<string, ModuleLoader>>;
  mainFields?: readonly string[];
  packageRoots: readonly string[];
  resolveExtensions?: readonly string[];
}

/** Absolute paths plus normalized policy for legacy generation. */
export interface ResolvedLegacyConfig extends Omit<
  LegacyConfig,
  "components" | "pagesDir"
> {
  components?: string;
  pagesDir: string;
}
