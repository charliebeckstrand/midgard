# Forced-colors tests

This folder holds the browser tests whose subject is forced colors, such as the Windows contrast themes. The `forced-light` and the `forced-dark` instances of [`vitest.browser.config.ts`](../../../../vitest.browser.config.ts) run each file here, and no other instance runs them.

## The page

The page of each instance has forced colors and a color scheme (`FORCED_CONTEXT_OPTIONS`, with `forcedColors` and `colorScheme`). Chromium then matches `(forced-colors: active)` and gives each system color, such as `Canvas` or `Highlight`, the value of the light or the dark forced palette. The two instances run each file, so each case reads the two palettes.

The other instances share a page that has no forced colors. A CDP media emulation on that page is page state: each call replaces each emulated feature, and a file that stops before its restore hands forced colors to each later file. Thus a forced case goes here, in an instance with a page of its own. `test-isolation-boundary.test.ts` stops a forced-colors emulation in each browser file, and each media emulation in this folder.

[`setup/forced-guard.ts`](setup/forced-guard.ts) stops each file of an instance when the page does not match forced colors. A case thus cannot pass on the author colors.

## Add a case

1. Put a `*.test.tsx` file in this folder. Use the name of the file of the fine half, when one exists.
2. Render the component and read what it paints. Compare a color with `systemColor` from [`../helpers/forced-colors`](../helpers/forced-colors.ts), and do not write the value of a palette, because the two instances have different palettes.
3. Put the cases of each top-level block in `eachAuthorScheme`, from the same helper. It runs each case with the light author scheme and with the `dark` class on the root, so each case reads the two palettes and the two author schemes. Write a case that holds on each of the four. A case that needs one palette or one scheme is a finding: a part that shows only there does not show to each reader.
4. Put the fine half of the behavior in the `browser` or `geometry` instance. Name each half in the doccomment of the other.
5. Run `pnpm --filter ui test:forced`.

The module mocks are the mocks of the `browser` instance. The renders and reads that the two halves share go in [`../helpers`](../helpers).

## What stays out

- [`recipes/forced-colors.test.ts`](../../recipes/forced-colors.test.ts) and [`boundary/forced-colors-boundary.test.ts`](../../boundary/forced-colors-boundary.test.ts) read the classes of the recipes. They paint nothing, so they stay in the jsdom and the boundary suites.
- [`file-upload-contrast-more.test.tsx`](../file-upload-contrast-more.test.tsx) emulates `prefers-contrast: more`, not forced colors. Forced colors do not make Chromium match `prefers-contrast: more`, so it stays in the `browser` instance.
