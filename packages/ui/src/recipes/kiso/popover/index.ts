/**
 * Popover archetype — floating overlay shared by popover, combobox,
 * listbox, and date-picker kata. Owns the trigger and portal classes, the
 * default body-text colour, and the panel slot bundle (base, surface,
 * glass, ring, motion).
 */

import { iro } from '../iro'
import { panel } from './panel'
import { portal } from './portal'
import { trigger } from './trigger'

export const popover = {
	trigger,
	portal,
	/** Default body-text colour applied inside the panel. */
	text: iro.text.default,
	panel,
} as const

export type Popover = typeof popover
