import { defineRecipe } from '../../core/recipe'
import { hannou, iro, kasane, omote } from '../kiso'
import { control } from '../kiso/control'
import { dan } from '../kiso/dan'
import { popover } from '../kiso/popover'

const { cursor } = hannou
const { text } = iro
const { rounded } = kasane
const { reset, density, surface } = control
const { portal, panel } = popover

const button = defineRecipe({
	base: [
		'flex items-center gap-2',
		...reset.base,
		'text-start',
		'appearance-none',
		...cursor,
		...density,
	],
})

/** The text of the color value in the trigger, cut to one line. */
const value = ['block', 'truncate']

const swatch = {
	base: ['relative shrink-0 overflow-hidden', rounded.sm, dan.size.check.box],
	/**
	 * The color of the trigger swatch, with the inset ring. An inset shadow paints above the
	 * background of its own element, but below the children of that element. The ring is on the
	 * color for this reason, so a white or a black color keeps an edge.
	 */
	fill: 'block size-full rounded-[inherit] ring-1 ring-inset ring-black/10 dark:ring-white/15',
	/** The checkerboard behind the trigger swatch while the color is translucent. */
	checkerboard: [omote.checkerboard, '[background-size:8px_8px]'],
}

export const k = {
	surface: {
		default: surface.default,
		glass: [],
	},
	button,
	value,
	swatch,
	content: {
		portal,
		motion: panel.motion,
		text: text.default,
		glass: panel.glass,
	},
}

/** The size scale of the control: `sm`, `md`, and `lg`. */
export const scale = control.scale
