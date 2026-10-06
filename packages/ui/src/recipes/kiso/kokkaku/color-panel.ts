/**
 * Kokkaku skeleton: color-panel. The silhouette of the picker across the three
 * control size steps. One placeholder covers empty rows that have the structure
 * of the real panel. So the box matches the panel at each step, with and
 * without the alpha slider and the swatches.
 *
 * `width` is the width of the real panel, and `max-w-full` keeps it inside a
 * narrow parent. The ColorPanel kata reads it. `area` is the height of the
 * color area, and `track` is the height of one slider track. `fields` is the
 * height of the preview row and the channel inputs, with the gap between them.
 * `swatch` is one square cell of the swatch grid. The ColorPanel kata reads it
 * for each chip, so a cell and a chip have the same box. Each height is a
 * stepped `density-*` class, so the silhouette takes the step of its nearest
 * density scope, as the picker does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: color-panel
 */

import { dan } from '../dan'

const width = [dan.size.colorPanel.width, 'max-w-full'] as const

export const colorPanel = {
	width,
	area: dan.size.colorPanel.area,
	track: dan.size.colorPanel.channel,
	fields: dan.size.colorPanel.fields,
	swatch: 'aspect-square w-full',
} as const
