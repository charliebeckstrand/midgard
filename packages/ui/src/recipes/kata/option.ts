import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { on } = iro
const { rounded } = kasane
const { flex, description } = narabi

const base = [
	...hannou.item,
	'group/option grid w-full items-baseline',
	'grid-cols-[1fr_--spacing(5)] sm:grid-cols-[1fr_--spacing(4)]',
	rounded.lg,
	...hannou.active,
	// Gap, padding, and text follow the nearest density scope.
	`${dan.gap.option} ${dan.space.option.x} ${dan.space.option.y}`,
	ji.ramp,
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
	// `on.wash.muted`, not `muted`: `hannou.item` / `hannou.active` ground a hovered
	// or roved row on the tint wash, which `muted` is not legal over. See `iro/ramp.ts`.
	description: [description, on.wash.muted],
	/**
	 * The selected-state check icon: its color and its size. The size is the
	 * glyph size of each step, as `shaku.icon.size` gives it.
	 */
	check: [...mode('text-green-600', 'dark:text-green-500'), dan.size.check.box],
} as const
