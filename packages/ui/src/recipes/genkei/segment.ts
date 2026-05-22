/**
 * Segmented-control archetype — the rounded box with a sliding indicator
 * shared by the standalone `<Segment>` family and `<Tabs variant="segment">`.
 *
 * Owns the control / item / indicator fragments. Per the genkei wire-format
 * contract, `defineRecipe()` is invoked only at the kata surface; each
 * consuming kata spreads `control` and `item` into its own
 * `defineRecipe({ ..., defaults })` call.
 *
 * Layer: genkei · Concern: segmented-control archetype
 */

import { hannou, ji, omote, sen } from '../kiso'

const control = {
	base: ['inline-flex items-center', 'rounded-lg', ...omote.tint],
	size: {
		sm: ['p-0.5', 'gap-xs'],
		md: ['p-1', 'gap-sm'],
		lg: ['p-1', 'gap-md'],
	},
}

const item = {
	base: [
		'flex items-center justify-center',
		'font-medium select-none',
		'whitespace-nowrap',
		'rounded-lg',
		sen.focus.indicator,
		sen.focus.ring,
		...hannou.disabled,
		...hannou.cursor,
		'outline-none',
	],
	size: {
		sm: ['px-2.5 py-1', ji.xs],
		md: ['px-3 py-1.5', ji.sm],
		lg: ['px-4 py-2', ji.md],
	},
}

export const segment = {
	control,
	item,
	indicator: ['bg-white', 'dark:bg-zinc-600'],
}
