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

/** Dark @firna/ui theme overrides for generated dark fragments. */
export const darkTokens = {
  ...tokens,
  colors: {
    bg: "#121514",
    bg2: "#1b201d",
    accent: "#7fae95",
    border: "#2a312d",
    border2: "#2a312d",
    controlBorder: "#2a312d",
    faint: "#9aa39d",
    ink: "#eef1ef",
    ink2: "#c2cac4",
    muted: "#9aa39d",
    placeholder: "#9aa39d",
    soft: "#1b201d",
    surface: "#1b201d",
  },
} as const;
