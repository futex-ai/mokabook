// Example @firna/ui theme overrides. The package ships its sage palette as
// the default, so only the web font stacks need restating for this
// server-rendered example; consumers with their own brand restate the colour
// and radius overrides their app uses here instead.

/** The @firna/ui theme overrides applied to every example screen. */
export const tokens = {
  fonts: {
    sans: '"Inter", system-ui, sans-serif',
    mono: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
  },
} as const;
