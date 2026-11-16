/**
 * Kokkaku skeleton: color-panel. The silhouette of the picker across the five
 * density steps. One placeholder covers empty rows that have the structure of
 * the real panel. So the box matches the panel at each step, with and without
 * the alpha slider and the swatches.
 *
 * The skeleton root is the root of the ColorPanel kata, so the silhouette has
 * the width of the real panel. `area` is the height of the color area, and
 * `track` is the height of one slider track. The preview row and the channel
 * field are the rows of the real panel, with empty parts in place of the
 * controls. `preview` is the box of the preview swatch, `control` is the
 * height of an input, and `line` is one line of the channel label. So the rows
 * take the height of the real rows from the same classes, with no sum of their
 * own. `swatch` is one square cell of the swatch grid. The ColorPanel kata
 * reads it for each chip, so a cell and a chip have the same box. Each height is a
 * stepped `density-*` class, so the silhouette takes the step of its nearest
 * density scope, as the picker does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: color-panel
 */

import { dan } from '../dan'

export const colorPanel = {
	area: dan.size.colorPanel.area,
	track: dan.size.colorPanel.channel,
	preview: dan.size.colorPanel.preview,
	control: dan.size.control.base,
	line: 'h-lh',
	swatch: 'aspect-square w-full',
} as const
