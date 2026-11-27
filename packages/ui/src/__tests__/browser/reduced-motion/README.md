# Reduced-motion tests

This folder holds the browser tests whose subject is the result for a reader who asks for reduced motion. The `reduced-motion` instance of [`vitest.browser.config.ts`](../../../../vitest.browser.config.ts) runs each file here, and no other instance runs them.

## The page

The page of the instance asks for reduced motion (`REDUCED_MOTION_CONTEXT_OPTIONS`, with `reducedMotion: 'reduce'`). Chromium then matches `(prefers-reduced-motion: reduce)`. Motion is real. Thus three readers of the setting agree:

- `usePrefersReducedMotion` and each other hook that reads the media query.
- The `motion-reduce:` and `motion-safe:` rules of the CSS.
- Motion, under the `reducedMotion: 'user'` of a `ReducedMotion` root. Motion skips a transform and keeps a fade.

A `matchMedia` stub (`stubMatchMedia`) on the page of another instance reaches only the hooks. The CSS reads the real media query, and Motion reads the query one time for each page and keeps the value. Thus with a stub, the hooks give reduced motion while the CSS and Motion give full motion. A case that passes there does not prove the result for a reader.

[`setup/reduced-motion-guard.ts`](setup/reduced-motion-guard.ts) stops each file of the instance when the page does not ask for reduced motion. It also stops a file when the root has the `reduced-motion` class of the Motion setting, because then the class, and not the platform setting, reduces the motion.

## Add a case

1. Put a `*.test.tsx` file in this folder. Use the name of the file of the full-motion half, when one exists.
2. Render the component and read its result. Do not stub `matchMedia`, and do not add the class of the Motion setting.
3. Put the full-motion half of the behavior in another instance, such as `motion` or `browser`. Name each half in the doccomment of the other.
4. Run `pnpm --filter ui test:reduced-motion`.

The module mocks are the mocks of the `motion` instance: `@floating-ui/react` is mocked, and the Motion features load before the first file.

## What stays out

- A case of the Motion setting (the `reduced-motion` class on the root, from `AppearanceProvider`) stays in its instance, with `holdRootClass` (`../helpers/root-state.ts`).
- A jsdom test that stubs the media query stays in the unit suite. jsdom runs no CSS and no Motion, so it checks the hook and not the result.
