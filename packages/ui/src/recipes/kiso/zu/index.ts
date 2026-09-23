/**
 * Zu archetype: the data-viz substrate that the chart and map modules share.
 * Three fragments: the categorical series `palette`, the chrome and readout
 * `ink`, and the reveal `motion`. Both kata read one source, so the
 * CVD-validated slot order and the chrome inks cannot fork between them.
 */

import { ink } from './ink'
import { motion } from './motion'
import { palette } from './palette'

export type { SeriesSlot } from './palette'

export const zu = {
	palette,
	ink,
	motion,
} as const
