/**
 * Popover archetype — floating overlay shared by popover, combobox,
 * listbox, and date-picker kata. Owns the trigger and portal classes plus
 * the panel slot bundle (base, surface, glass, ring, motion).
 */

import { panel } from './panel'
import { portal } from './portal'
import { trigger } from './trigger'

export const popover = {
	trigger,
	portal,
	panel,
} as const
