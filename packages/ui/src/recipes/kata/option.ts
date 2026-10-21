import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { rounded } = kasane
const { flex } = narabi

const base = [
	...hannou.item.base,
	'group/option grid w-full items-baseline',
	// The check column is as wide as the check, which takes the step of the nearest
	// scope. The check of a row that is not selected is invisible, so it keeps the
	// column.
	'grid-cols-[1fr_auto]',
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
	label: [hannou.item.label, 'group-data-selected/option:font-bold'],
	text: hannou.item.text,
	description: hannou.item.description,
	/**
	 * The selected-state check icon: its color and its size. The size is the
	 * glyph size of each step.
	 */
	check: [...iro.marker.green, dan.size.check.box],
} as const
