/**
 * Popover archetype: floating overlay shared by popover, combobox,
 * listbox, date-picker, and color-picker kata. Owns the trigger and portal classes, the
 * default body-text color, and the panel slot bundle (base, surface,
 * glass, ring, motion).
 */

import { iro } from '../iro'
import { panel } from './panel'
import { portal } from './portal'
import { trigger } from './trigger'

export const popover = {
	trigger,
	portal,
	/** Default body-text color applied inside the panel. */
	text: iro.text.default,
	panel,
} as const
