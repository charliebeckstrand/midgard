/**
 * Hannou fg: foreground (text-color) feedback on interaction state.
 * Hover gives the strong foreground, except on a part that is disabled in either
 * spelling (`:disabled` or `data-disabled`); disabled lifts it; `current`
 * marks the active surface (the current tab) via `data-current`.
 * `open` and `expanded` give a muted disclosure trigger the strong text while
 * its content shows: `open` reads `data-open` (a Tree row, a JsonTree toggle),
 * and `expanded` reads the `aria-expanded` of the trigger itself (Accordion,
 * Collapse).
 *
 * Layer: kiso · Concern: foreground state
 */

import { mode } from '../../../core/recipe'

export const fg = {
	hover: mode(
		'hover:not-disabled:not-data-disabled:text-zinc-950',
		'dark:hover:not-disabled:not-data-disabled:text-white',
	),
	disabled: mode(
		['has-disabled:text-zinc-500', 'has-disabled:**:data-[slot=label]:text-zinc-500'],
		['dark:has-disabled:text-zinc-400', 'dark:has-disabled:**:data-[slot=label]:text-zinc-400'],
	),
	current: mode('data-current:text-zinc-950', 'dark:data-current:text-white'),
	open: mode('data-open:text-zinc-950', 'dark:data-open:text-white'),
	expanded: mode('aria-expanded:text-zinc-950', 'dark:aria-expanded:text-white'),
} as const
