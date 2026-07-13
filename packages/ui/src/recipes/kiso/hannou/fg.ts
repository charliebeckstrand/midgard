/**
 * Hannou fg: foreground (text-colour) feedback on interaction state.
 * Hover / focus darken the foreground; disabled lifts it; `current`
 * marks the active surface (e.g. the current nav item) via `data-current`.
 * Pairs with `omote.bg`: `omote.bg.X` paints the surface,
 * `hannou.fg.X` paints the text response.
 *
 * Layer: kiso · Concern: foreground state
 */

import { mode } from '../../../core/recipe'

export const fg = {
	hover: mode('hover:not-disabled:text-neutral-950', 'dark:hover:not-disabled:text-white'),
	focus: mode(
		'focus-visible:not-disabled:text-neutral-950',
		'dark:focus-visible:not-disabled:text-white',
	),
	disabled: mode(
		['has-disabled:text-neutral-500', 'has-disabled:**:data-[slot=label]:text-neutral-500'],
		[
			'dark:has-disabled:text-neutral-400',
			'dark:has-disabled:**:data-[slot=label]:text-neutral-400',
		],
	),
	current: mode('data-current:text-neutral-950', 'dark:data-current:text-white'),
}
