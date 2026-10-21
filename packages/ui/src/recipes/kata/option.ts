import { defineKata, mode } from '../../core/recipe'
import { iro, ji, narabi } from '../kiso'
import { dan } from '../kiso/dan'
import { item } from '../kumi/item'

const { flex } = narabi

export const k = defineKata({
	extends: item,
	base: [
		'grid w-full items-baseline',
		// The check column is as wide as the check, which takes the step of the nearest
		// scope. The check of a row that is not selected is invisible, so it keeps the
		// column.
		'grid-cols-[1fr_auto]',
		// Gap, padding, and text follow the nearest density scope.
		`${dan.gap.option} ${dan.space.option.x} ${dan.space.option.y}`,
		ji.ramp,
		...mode(
			'group-data-editing/combobox:only-of-type:bg-zinc-950/5',
			'dark:group-data-editing/combobox:only-of-type:bg-white/5',
		),
	],
	slots: {
		content: [flex.row, 'min-w-0', narabi.item],
		label: 'group-data-selected/option:font-bold',
		/**
		 * The selected-state check icon: its color and its size. The size is the
		 * glyph size of each step.
		 */
		check: [...iro.marker.green, dan.size.check.box],
	},
})
