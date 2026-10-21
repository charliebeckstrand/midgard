import { defineKata } from '../../core/recipe'
import { hannou, kasane, kokkaku, narabi, omote, sen } from '../kiso'
import { dan } from '../kiso/dan'
import { popover } from '../kiso/popover'
import { trigger } from '../kumi/control'

export { scale } from '../kumi/control'

const { cursor } = hannou
const { rounded } = kasane
const { flex } = narabi
const { fit, picker } = popover

/** The text of the color value in the trigger, cut to one line. */
const value = ['block', 'truncate']

const swatch = {
	base: ['relative shrink-0 overflow-hidden', rounded.sm, dan.size.check.box],
	/**
	 * The color of the trigger swatch, with the inset ring. An inset shadow paints above the
	 * background of its own element, but below the children of that element. The ring is on the
	 * color for this reason, so a white or a black color keeps an edge.
	 */
	fill: [
		'block size-full rounded-[inherit]',
		...sen.ring.line[1].inset,
		'ring-black/10 dark:ring-white/15',
	],
	/** The checkerboard behind the trigger swatch while the color is translucent. */
	checkerboard: [omote.checkerboard, 'bg-size-[8px_8px]'],
}

export const k = defineKata(
	{
		extends: trigger,
		slots: {
			/** The button that opens the picker. */
			field: { base: [flex.row, 'text-start', 'appearance-none', ...cursor] },
		},
	},
	{
		root: picker.root,
		value,
		swatch,
		skeleton: kokkaku.colorPicker,
		content: {
			...picker.content,
			scroll: fit.scroll,
		},
	},
)
