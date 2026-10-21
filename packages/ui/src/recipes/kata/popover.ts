/**
 * Popover kata: the surface of `<Popover>` and of the PopoverPanel primitive,
 * which both read it. `trigger` keeps the anchor inline with the text or the
 * icons around it. `portal` rides the `float` rung of the stacking order,
 * which clears every overlay rung, because a popover opens from inside a modal
 * panel too. `panel` holds the parts of the floating panel.
 */
import { defineScale } from '../../core/density'
import { hannou, iro, kasane, omote, sen, sou, ugoki } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor } = hannou
const { rounded } = kasane
const { ring } = sen

export const k = {
	trigger: 'inline-flex',
	portal: sou.float,
	/** The body text inside the panel. */
	text: ['text-pretty', iro.text.default],
	panel: {
		base: [
			'z-50',
			'absolute isolate',
			'min-w-full',
			'p-1 space-y-0.5',
			'overflow-y-auto overscroll-contain',
			rounded.lg,
			'outline outline-transparent focus:outline-hidden',
			...cursor,
			'select-none',
		],
		surface: omote.popover,
		glass: omote.glass,
		ring: ring.default,
		motion: ugoki.popover,
	},
	/** The padding of the panel at each density step: the `lg` stop of the padding scale. */
	padding: dan.space.popover,
}

/** The size scale of {@link PopoverContent}: the steps of its padding. */
export const scale = defineScale(dan.space.popover)
