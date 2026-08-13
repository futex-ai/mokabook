/** Compare-mode styles: the document stack inside each device screen, the
 * base/overlay/difference compositions, and the missing-base handling. */

/** Compare-mode rules appended to the shell stylesheet. */
export const SHELL_COMPARE_CSS = `
/* ---- Compare document stack ------------------------------------------- */

.mbk-cmp-stack {
  display: grid;
}

.phone-screen .mbk-cmp-stack {
  flex: 1 1 auto;
  min-height: 0;
}

.browser-viewport .mbk-cmp-stack {
  height: 100%;
}

.mbk-cmp-stack > .mbk-frag {
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
}

/* The stack keeps the fragment sizing its slot previously gave the iframe. */
.phone-screen .mbk-cmp-stack > .mbk-frag {
  flex: none;
  min-height: 100%;
}

/* ---- Modes ------------------------------------------------------------- */

/* Base documents paint under the head document; the head composes over
   them. Current never renders a base frame at all. */
[data-compare="base"] .mbk-cmp-stack > .mbk-frag:not(.mbk-frag--base) {
  opacity: 0;
  pointer-events: none;
}

[data-compare="overlay"] .mbk-cmp-stack > .mbk-frag:not(.mbk-frag--base) {
  opacity: 0.5;
  pointer-events: none;
}

[data-compare="difference"] .mbk-cmp-stack > .mbk-frag:not(.mbk-frag--base) {
  mix-blend-mode: difference;
  pointer-events: none;
}

/* ---- Missing base documents ------------------------------------------- */

/* A render absent at the branch point shows the placeholder document the
   base frame loads, alone, in every non-Current mode. */
body:not([data-mokabook-color-scheme="dark"])
  [data-compare]:not([data-compare="current"])
  [data-base-missing-light]
  .mbk-cmp-stack
  > .mbk-frag:not(.mbk-frag--base),
body[data-mokabook-color-scheme="dark"]
  [data-compare]:not([data-compare="current"])
  [data-base-missing-dark]
  .mbk-cmp-stack
  > .mbk-frag:not(.mbk-frag--base) {
  opacity: 0;
  mix-blend-mode: normal;
  pointer-events: none;
}
`;
