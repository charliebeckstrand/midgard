/**
 * Shaku (尺): measure. Dimension scales: width, height, and the
 * icon-slot size grid. Typography lives in `ji`; padding, margin, and
 * gap live in `ma`. One file per concern; this barrel assembles the
 * named bundle that every kata reads.
 */

import { combobox } from './combobox'
import { icon, iconRamp, iconSize, iconSlotRamp } from './icon'
import { listbox } from './listbox'
import { mark } from './mark'
import { panel } from './panel'
import { scrollArea } from './scroll-area'

export const shaku = {
	icon,
	iconSize,
	iconRamp,
	iconSlotRamp,
	panel,
	scrollArea,
	mark,
	combobox,
	listbox,
} as const
