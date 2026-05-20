/**
 * Option-row archetype consumed by the `BaseOption` primitive. The primitive
 * is the React implementation; combobox, listbox, and select-like components
 * reach the styling indirectly through `createSelectOption` from
 * `primitives/option`.
 *
 * Exposes plain class fragments (`string[]`) and a size-keyed fragment map.
 * Per the waku wire-format contract, `defineRecipe()` is invoked only at the kata
 * public surface; consumers compose these fragments into whatever shape
 * they need.
 *
 * Layer: waku · Concern: option-row archetype
 */

import { iro, ji, narabi, sawari } from '../../core/recipe'

const base = [
	'group/option grid w-full items-baseline',
	'grid-cols-[1fr_--spacing(5)] sm:grid-cols-[1fr_--spacing(4)]',
	'rounded-lg',
	...sawari.item,
	'data-active:bg-zinc-950/5',
	'dark:data-active:bg-white/5',
	'group-data-editing/combobox:only-of-type:bg-zinc-950/5',
	'dark:group-data-editing/combobox:only-of-type:bg-white/5',
]

const size = {
	sm: ['gap-2 px-2 py-1', ji.size.sm],
	md: ['gap-3 px-2.5 py-1.5', ji.size.md],
	lg: ['gap-3 px-3 py-2.5', ji.size.lg],
} as const

export const option = {
	base,
	size,
	content: ['flex min-w-0 items-center', narabi.item],
	label: 'truncate group-data-selected/option:font-bold',
	description: [narabi.description, iro.text.muted],
} as const

export type OptionSize = keyof typeof option.size
