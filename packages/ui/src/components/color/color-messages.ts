import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'

// The values of each color message, by key.
type ColorValues = {
	area: Record<never, never>
	areaValue: { saturation: number; brightness: number }
	channel: { channel: string }
	alphaChannel: Record<never, never>
	eyedropper: Record<never, never>
	hex: Record<never, never>
	copyHex: Record<never, never>
	choose: Record<never, never>
	hue: Record<never, never>
	alpha: Record<never, never>
	swatches: Record<never, never>
}

/**
 * The messages of the color controls: the names of the area, the sliders, the
 * channel fields, the hex field, the eyedropper, the swatches, and the picker
 * dialog.
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
		defaultMessage: 'Saturation {saturation}%, brightness {brightness}%',
		description: 'The value text of the color area. Each value is a percent from 0 to 100.',
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
		defaultMessage: 'Pick color from screen',
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
	choose: {
		id: 'ui.color.choose',
		defaultMessage: 'Choose color',
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
})
