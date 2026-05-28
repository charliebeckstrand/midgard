/**
 * Hannou text — text-colour feedback on interaction state. Hover / focus
 * darken the foreground; disabled lifts it; `current` marks the active
 * surface (e.g. the current nav item) without depending on a colour
 * variant.
 *
 * Layer: kiso · Concern: text-colour state
 */

import { mode } from '../../../core/recipe'

export const text = {
	hover: mode('hover:not-disabled:text-zinc-950', 'dark:hover:not-disabled:text-white'),
	focus: mode(
		'focus-visible:not-disabled:text-zinc-950',
		'dark:focus-visible:not-disabled:text-white',
	),
	disabled: mode(
		['has-disabled:text-zinc-500', 'has-disabled:**:data-[slot=label]:text-zinc-500'],
		['dark:has-disabled:text-zinc-400', 'dark:has-disabled:**:data-[slot=label]:text-zinc-400'],
	),
	current: mode('data-current:text-zinc-950', 'dark:data-current:text-white'),
}
