/**
 * Zu archetype: the data-viz substrate that the chart and map modules share.
 * Four fragments: the categorical series `palette`, the `meter` shade of a
 * measured value, which reads its hues from the palette, the chrome and readout
 * `ink`, and the reveal `motion`. Both kata read one source, so the
 * CVD-validated slot order and the chrome inks cannot fork between them.
 */

import { ink } from './ink'
import { meter } from './meter'
import { motion } from './motion'
import { palette } from './palette'

export type { SeriesSlot } from './palette'

export const zu = {
	palette,
	meter,
	ink,
	motion,
} as const
