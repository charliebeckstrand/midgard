/**
 * Zu meter: the shade that a measured value paints in, per palette color. The
 * progress bar fills with `bg`, and the progress gauge draws its ring with
 * `stroke`. A sparkline draws its line and end point with `stroke`, and its
 * bars and area with `fill`. A tier of the password strength bar fills with
 * `bg`.
 *
 * Each color is the series slot of the same hue, not a copy of its classes.
 * Thus a progress bar and a swatch, a chart mark, or a map region in the same
 * color show the same shade in each mode.
 *
 * Layer: kiso · Archetype: zu · Concern: meter
 */

import type { Color } from '../../../core/recipe'
import { palette } from './palette'

const { series } = palette

export const meter = {
	zinc: series.zinc,
	red: series.red,
	amber: series.amber,
	green: series.green,
	blue: series.blue,
} as const satisfies Record<Color, Record<'bg' | 'stroke' | 'fill', string[]>>
