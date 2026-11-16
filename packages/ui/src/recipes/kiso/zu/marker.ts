/**
 * Zu marker: the shade of a chromatic dot or glyph on the page surface, per
 * palette color: a status dot, a spinner, a star, a timeline marker. Each color
 * is the text of the series slot of the same hue, so a dot, a slider fill, a
 * meter, and a chart mark in one hue show one shade in each mode. Each slot
 * shade clears the non-text 3:1 floor (WCAG 1.4.11) on the page surface. Like
 * each chromatic slot, the zinc slot is 600 in light, so a neutral spinner or
 * star reads as firmly as a chromatic one.
 *
 * Layer: kiso · Concern: marker
 */

import type { Color } from '../../../core/recipe'
import { palette } from './palette'

const { series } = palette

export const marker = {
	zinc: series.zinc.text,
	red: series.red.text,
	amber: series.amber.text,
	green: series.green.text,
	blue: series.blue.text,
} as const satisfies Record<Color, string[]>
