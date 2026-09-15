/**
 * The workspace package version the site publishes. The real site reads the
 * same field from `@mokly/mokly` at build time; this module reads it from the
 * workspace manifest so the mockup never states a version of its own.
 */

import manifest from "../../../../../../../../package.json" with { type: "json" };

/** The published `@mokly/mokly` version, for example `0.9.0`. */
export const PACKAGE_VERSION: string = manifest.version;
