/**
 * Popover archetype: floating overlay shared by popover, combobox,
 * listbox, date-picker, and color-picker kata. Owns the trigger and portal classes, the
 * default body-text color, and the panel slot bundle (base, surface,
 * glass, ring, motion), and the picker group of DatePicker and ColorPicker.
 */

import { iro } from '../iro'
import { fit } from './fit'
import { panel } from './panel'
import { picker } from './picker'
import { portal } from './portal'
import { trigger } from './trigger'

export const popover = {
	trigger,
	portal,
	fit,
	/** Default body-text color applied inside the panel. */
	text: iro.text.default,
	panel,
	picker,
} as const
