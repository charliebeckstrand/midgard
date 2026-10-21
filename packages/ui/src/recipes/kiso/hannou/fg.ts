/**
 * Hannou fg: foreground (text-color) feedback on interaction state.
 * Hover darkens the foreground; disabled lifts it; `current`
 * marks the active surface (e.g. the current nav item) via `data-current`.
 * `open` and `expanded` give a muted disclosure trigger the strong text while
 * its content shows: `open` reads `data-open` (a Tree row, a JsonTree toggle),
 * and `expanded` reads the `aria-expanded` of the trigger itself (Accordion,
 * Collapse).
 * Pairs with `omote.bg`: `omote.bg.X` paints the surface,
 * `hannou.fg.X` paints the text response.
 *
 * Layer: kiso · Concern: foreground state
 */

import { mode } from '../../../core/recipe'

export const fg = {
	hover: mode('hover:not-disabled:text-zinc-950', 'dark:hover:not-disabled:text-white'),
	disabled: mode(
		['has-disabled:text-zinc-500', 'has-disabled:**:data-[slot=label]:text-zinc-500'],
		['dark:has-disabled:text-zinc-400', 'dark:has-disabled:**:data-[slot=label]:text-zinc-400'],
	),
	current: mode('data-current:text-zinc-950', 'dark:data-current:text-white'),
	open: mode('data-open:text-zinc-950', 'dark:data-open:text-white'),
	expanded: mode('aria-expanded:text-zinc-950', 'dark:aria-expanded:text-white'),
} as const
