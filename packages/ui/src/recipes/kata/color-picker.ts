import { defineRecipe } from '../../core/recipe'
import { hannou, iro, kasane, kokkaku, omote } from '../kiso'
import { control } from '../kiso/control'
import { dan } from '../kiso/dan'
import { popover } from '../kiso/popover'

const { cursor } = hannou
const { text } = iro
const { rounded } = kasane
const { reset, density, surface } = control
const { portal, panel, fit } = popover

const button = defineRecipe({
	base: [
		`flex items-center ${dan.gap.scale.sm}`,
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
	checkerboard: [omote.checkerboard, 'bg-size-[8px_8px]'],
}

/**
 * The box of the trigger. It is as wide as the swatch and the color value,
 * not as wide as its parent, and it does not get wider than its parent.
 */
const root = ['w-fit', 'max-w-full']

export const k = {
	root,
	surface: {
		default: surface.default,
		glass: [],
	},
	button,
	value,
	swatch,
	skeleton: kokkaku.colorPicker,
	content: {
		portal: [portal, fit.wrapper],
		motion: panel.motion,
		column: fit.column,
		text: text.default,
		glass: panel.glass,
		scroll: fit.scroll,
	},
}

/** The size scale of the control: each step from `xs` to `xl`. */
export const scale = control.scale
