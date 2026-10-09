/**
 * Popover archetype: picker. The parts that DatePicker and ColorPicker share.
 * `root` sizes the box of the trigger to its content. The box does not fill
 * its parent, and it does not get wider than its parent. `content` holds the
 * classes of the dialog panel.
 *
 * Layer: kiso · Archetype: popover · Concern: picker
 */

import { iro } from '../iro'
import { fit } from './fit'
import { panel } from './panel'
import { portal } from './portal'

export const picker = {
	root: ['w-fit', 'max-w-full'],
	content: {
		portal: [portal, fit.wrapper],
		motion: panel.motion,
		column: fit.column,
		text: iro.text.default,
		glass: panel.glass,
	},
} as const
