import type { MokabookConfig } from "./types.js";

/** Preserve inference while declaring a typed Mokabook configuration. */
export function defineConfig<const Config extends MokabookConfig>(
  config: Config,
): Config {
  return config;
}
