# Coarse-pointer tests

This folder holds the browser tests whose subject is a coarse pointer, such as a finger on a touch screen. The `coarse` instance of [`vitest.browser.config.ts`](../../../../vitest.browser.config.ts) runs each file here, and no other instance runs them.

## The page

The page of the instance has a touch screen (`COARSE_CONTEXT_OPTIONS`, with `hasTouch`). Chromium then matches `(pointer: coarse)`, `(any-pointer: coarse)`, and `(hover: none)`. Thus the real `pointer-coarse:` rules of the CSS lay out each case. The 44px floor of `TouchTarget`, the touch pitch, and each part that shows only to a finger apply as they do on a phone.

The other instances share a page that has a mouse. A CDP touch emulation on that page cannot stop cleanly, because `hover: hover` and `pointer: fine` do not come back. Thus a coarse case goes here, in an instance with a page of its own.

[`setup/coarse-guard.ts`](setup/coarse-guard.ts) stops each file of the instance when the page does not match a coarse pointer. A case thus cannot pass on the layout of a mouse.

## Add a case

1. Put a `*.test.tsx` file in this folder. Use the name of the file of the fine half, when one exists.
2. Render the component and measure it. Do not add a stylesheet that copies a coarse rule or sets the floor.
3. Put the fine half of the behavior in the `browser` or `geometry` instance. Name each half in the doccomment of the other.
4. Run `pnpm --filter ui test:coarse`.

The module mocks are the mocks of the `browser` instance. A geometry helper, such as `overlappingHitAreas`, comes from [`../geometry/helpers`](../geometry/helpers).

## What stays out

- [`docs-build/touch-targets.test.ts`](../../docs-build/touch-targets.test.ts) reads each page of the docs build as a phone. It needs the build, so it stays in the docs build suite.
- A jsdom test that reads a `pointer-coarse:` class stays in the unit suite. jsdom lays out nothing, so it checks the class and not the layout.
