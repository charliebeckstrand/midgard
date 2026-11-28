/**
 * Browser expressions that tell when a page of the docs build is ready. A test
 * of `test:docs-build`, `docs:bench`, or `docs:parity` waits for one in the
 * page, such as with `page.waitForFunction`.
 */

/**
 * A browser expression that is `true` when the hydration render gets to the
 * heading, for `test:docs-build` and `docs:bench`. Hydration gives the heading
 * a React fiber. A prerendered heading has none.
 *
 * The expression is `true` before the hydration commits. The client hydrates
 * in a transition, so React renders the page in slices, and the heading of
 * the shell gets its fiber before the content does. Effects run only after the
 * commit. On the bench page, the commit came well after the heading, and no
 * request or long task started between the two. A check that needs the effects
 * of the page must wait for a later signal, such as {@link STYLED}.
 */
export const HYDRATED = `Object.keys(document.querySelector('h1') ?? {}).some((key) => key.startsWith('__reactFiber'))`

/**
 * A browser expression that is `true` when the full stylesheet of the page
 * loaded. The app renders the link of the sheet after the hydration commits
 * (`docs/app/root.tsx`), so the effects of the page have run. {@link HYDRATED}
 * is `true` earlier: on a loaded machine, the content stayed as the
 * prerendered markup for seconds after it, and a tab panel still had the
 * `tabindex` of the server.
 */
export const STYLED = `document.querySelector('link[rel="stylesheet"][data-precedence]')?.sheet != null`
