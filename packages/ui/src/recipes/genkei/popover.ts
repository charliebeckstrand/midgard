/**
 * Popover archetype — floating overlay shared by `popover`, `combobox`,
 * `listbox`, `date-picker` kata. Owns the trigger / portal positioning and
 * the panel slot bundle (base classes + surface chromes + ring + motion).
 * Property names mirror the kata slot layout so consumers can destructure
 * and pass through directly.
 *
 * Layer: genkei · Concern: floating overlay
 */

import { omote, sen, ugoki } from '../kiso'

export const popover = {
	trigger: 'inline-flex',
	portal: 'z-100',
	panel: {
		base: [
			'rounded-lg',
			'absolute isolate z-50 min-w-full',
			'p-1 space-y-0.5',
			'outline outline-transparent focus:outline-hidden',
			'overflow-y-auto overscroll-contain',
			'cursor-pointer select-none',
		],
		surface: omote.popover,
		glass: omote.glass,
		ring: sen.ring,
		motion: ugoki.popover,
	},
}
