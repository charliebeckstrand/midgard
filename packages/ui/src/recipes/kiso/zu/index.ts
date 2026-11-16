/**
 * Zu (図): the data-viz substrate. The categorical series `palette`, the
 * `meter` shade of a measured value, and the `marker` shade of a dot or a
 * glyph give each unit that paints a hue as a graphic its shade. The meter and
 * the marker read their hues from the palette. The chrome `ink`, the readout
 * `touch` posture, and the reveal `motion` are what the chart and map kata
 * share. Each reader reads one source, so the CVD-validated slot order and the
 * chrome inks cannot fork.
 */

import { ink } from './ink'
import { marker } from './marker'
import { meter } from './meter'
import { motion } from './motion'
import { palette } from './palette'
import { touch } from './touch'

export type { SeriesSlot } from './palette'

export const zu = {
	palette,
	meter,
	marker,
	ink,
	touch,
	motion,
} as const
