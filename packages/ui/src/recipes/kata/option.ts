import { mode } from '../../core/recipe'
import { hannou, iro, kasane, narabi, textRamp } from '../kiso'

const { onWash } = iro
const { rounded } = kasane
const { flex, description } = narabi

const base = [
	...hannou.item,
	'group/option grid w-full items-baseline',
	'grid-cols-[1fr_--spacing(5)] sm:grid-cols-[1fr_--spacing(4)]',
	rounded.lg,
	...hannou.active,
	// Gap, padding, and text follow the nearest density scope.
	'density-gap-[2,3,3] density-px-[2,2.5,3] density-py-[1,1.5,2.5]',
	textRamp,
	...mode(
		'group-data-editing/combobox:only-of-type:bg-zinc-950/5',
		'dark:group-data-editing/combobox:only-of-type:bg-white/5',
	),
]

export const k = {
	base,
	content: [flex.row, 'min-w-0', narabi.item],
	label: 'truncate group-data-selected/option:font-bold',
	// A column that stacks a label over its description.
	text: narabi.text,
	// `onWash.muted`, not `muted`: `hannou.item` / `hannou.active` ground a hovered
	// or roved row on the tint wash, which `muted` is not legal over. See `iro/ramp.ts`.
	description: [description, onWash.muted],
	check: mode('text-green-600', 'dark:text-green-500'),
	/**
	 * The size of the selected-state check icon. It is the `sm`, `md`, and `lg`
	 * steps of `shaku.iconSize`, and each outer step takes the size of its neighbor.
	 */
	checkSize: 'density-size-[4,5,6]',
} as const
