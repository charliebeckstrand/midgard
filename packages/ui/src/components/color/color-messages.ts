import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'
import type { ColorHueName } from './color-utilities'

// The values of each color message, by key.
type ColorValues = {
	area: Record<never, never>
	areaValue: { saturation: number; brightness: number }
	channel: { channel: string }
	alphaChannel: Record<never, never>
	eyedropper: Record<never, never>
	hex: Record<never, never>
	copyHex: Record<never, never>
	select: Record<never, never>
	hue: Record<never, never>
	alpha: Record<never, never>
	swatches: Record<never, never>
	swatch: { hue: ColorHueName; hex: string }
	picker: Record<never, never>
}

/**
 * The messages of the color controls: the names of the area, the sliders, the
 * channel fields, the hex field, the eyedropper, the swatches and each preset,
 * and the picker trigger and its dialog.
 *
 * @internal
 */
export const colorMessages: MessageSet<ColorValues> = defineMessages<ColorValues>({
	area: {
		id: 'ui.color.area',
		defaultMessage: 'Saturation and brightness',
		description:
			'The name of the two-axis area that sets the saturation and the brightness of a color.',
	},
	areaValue: {
		id: 'ui.color.areaValue',
		defaultMessage:
			'Saturation {saturation, number, percent}, brightness {brightness, number, percent}',
		description:
			'The value text of the color area. Each value is a fraction from 0 to 1, which shows as a percent.',
	},
	channel: {
		id: 'ui.color.channel',
		defaultMessage: '{channel} channel',
		description:
			'The name of the field of one color channel. The channel is its letter: R, G, or B.',
	},
	alphaChannel: {
		id: 'ui.color.alphaChannel',
		defaultMessage: 'Alpha channel',
		description: 'The name of the field of the opacity of a color.',
	},
	eyedropper: {
		id: 'ui.color.eyedropper',
		defaultMessage: 'Select color from screen',
		description: 'The name of the button that takes a color from a point on the screen.',
	},
	hex: {
		id: 'ui.color.hex',
		defaultMessage: 'Hex',
		description: 'The label of the field of the hexadecimal code of a color.',
	},
	copyHex: {
		id: 'ui.color.copyHex',
		defaultMessage: 'Copy hex value',
		description: 'The name of the button that copies the hexadecimal code of a color.',
	},
	select: {
		id: 'ui.color.select',
		defaultMessage: 'Select color',
		description: 'The name of the dialog of a color picker.',
	},
	hue: {
		id: 'ui.color.hue',
		defaultMessage: 'Hue',
		description: 'The name of the slider that sets the hue of a color.',
	},
	alpha: {
		id: 'ui.color.alpha',
		defaultMessage: 'Alpha',
		description: 'The name of the slider that sets the opacity of a color.',
	},
	swatches: {
		id: 'ui.color.swatches',
		defaultMessage: 'Swatches',
		description: 'The name of the group of preset colors.',
	},
	swatch: {
		id: 'ui.color.swatch',
		defaultMessage:
			'{hue, select, red {Red} orange {Orange} yellow {Yellow} green {Green} cyan {Cyan} blue {Blue} purple {Purple} pink {Pink} white {White} black {Black} other {Gray}}, {hex}',
		description:
			'The name of one preset color: a coarse name of the color, then its hexadecimal code, such as "Red, #EF4444".',
	},
	picker: {
		id: 'ui.color.picker',
		defaultMessage: 'Color',
		description: 'The name of the button that opens a color picker, when no label names it.',
	},
})
