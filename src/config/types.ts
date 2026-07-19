/** Filesystem changes understood by the watched development runtime. */
export type WatchAction = "ignore" | "rebuild" | "reload" | "restart";

/** One glob-to-stylesheet mapping evaluated in declaration order. */
export interface StylesheetRule {
  /** POSIX glob matched against a screen or legacy route. */
  match: string;
  /** Paths relative to `mockupsDir`, or absolute HTTP(S) URLs. */
  stylesheets: readonly string[];
}

/** Optional support for pre-registry source pages during consumer migration. */
export interface LegacyConfig {
  /** Config-relative source directory containing legacy source pages. */
  pagesDir: string;
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
  compatibility: Required<CompatibilityConfig>;
  configPath: string;
  entriesDir: string;
  legacy?: ResolvedLegacyConfig;
  mockupsDir: string;
  renderer?: string;
  repoRoot: string;
  review: Required<ReviewConfig>;
  stylesheets: readonly StylesheetRule[];
  watch: Required<Pick<WatchConfig, "debounceMs">> & {
    rules: readonly WatchRule[];
  };
}

/** Absolute paths plus normalized policy for legacy generation. */
export interface ResolvedLegacyConfig extends Omit<
  LegacyConfig,
  "components" | "pagesDir"
> {
  components?: string;
  pagesDir: string;
}
