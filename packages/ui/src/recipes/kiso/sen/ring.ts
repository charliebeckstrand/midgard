/**
 * Sen ring: the box-shadow rings of the library. A kata takes a ring from here
 * and does not write a ring width itself (CONVENTIONS §5.10).
 *
 * A ring is a box-shadow, which forced colors remove, so each ring carries an
 * outline of the same width and position. The outline keeps the edge under
 * forced colors.
 *
 *   - `default`, `inset`: the 1 px ring in the default tone. The inset ring is
 *     the one composers reach for inside translucent containers (popover,
 *     panel), where an outset ring would crop against the surface chrome.
 *   - `line`: the ring of each width with no color, for a kata that sets its own
 *     color. `line[1].inset` is the 1 px inset ring. An outset ring is for a
 *     mark on content, such as a selected PDF region, where an inset ring would
 *     cover the content.
 *   - `thumb`: the rings of the native range thumb, in the WebKit and the Gecko
 *     form. Under forced colors the range shows its native thumb in system
 *     colors, and the outline of the input marks the focus.
 *
 * Layer: kiso · Concern: rings
 */

import { mode } from '../../../core/recipe'

import { forced } from './forced'
import { contrastMore } from './tone'

/** The ring color: low contrast. */
const color = mode(
	['ring-zinc-950/10', contrastMore.ring.light],
	['dark:ring-white/10', contrastMore.ring.dark],
)

/** The ring of each width and position, each with its forced-colors outline. */
const line = {
	1: {
		outset: ['ring-1', forced.outline],
		inset: ['ring-1 ring-inset', forced.outline, 'forced-colors:-outline-offset-1'],
	},
	2: {
		outset: ['ring-2', forced.outline, 'forced-colors:outline-2'],
		inset: [
			'ring-2 ring-inset',
			forced.outline,
			'forced-colors:outline-2 forced-colors:-outline-offset-2',
		],
	},
} as const

/**
 * The rings of the native range thumb. Tailwind reads only literal class names,
 * so each pseudo-element writes its own rings. Under forced colors the range is
 * native (`forced.control`), so the thumb takes system colors, and the outline
 * of the input marks the focus and the invalid state.
 */
const thumb = [
	forced.control,
	...forced.ring.outset,
	...forced.invalid.outset,

	'[&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-zinc-950/20',
	'dark:[&::-webkit-slider-thumb]:ring-white/20',
	// An invalid range rings its thumb in red, as an invalid checkbox rings its box.
	'data-invalid:[&::-webkit-slider-thumb]:ring-2',
	'data-invalid:[&::-webkit-slider-thumb]:ring-red-600',
	'focus-visible:[&::-webkit-slider-thumb]:ring-4',
	'focus-visible:[&::-webkit-slider-thumb]:ring-blue-600',
	'dark:focus-visible:[&::-webkit-slider-thumb]:ring-blue-500',

	'[&::-moz-range-thumb]:ring-1 [&::-moz-range-thumb]:ring-zinc-950/20',
	'dark:[&::-moz-range-thumb]:ring-white/20',
	'data-invalid:[&::-moz-range-thumb]:ring-2',
	'data-invalid:[&::-moz-range-thumb]:ring-red-600',
	'focus-visible:[&::-moz-range-thumb]:ring-4',
	'focus-visible:[&::-moz-range-thumb]:ring-blue-600',
	'dark:focus-visible:[&::-moz-range-thumb]:ring-blue-500',
]

export const ring = {
	/** Default ring: 1 px line, low-contrast palette, and an outline under forced colors. */
	default: [...line[1].outset, ...color],
	/** Inset ring: sits inside the element, subtle in light / stronger in dark. */
	inset: [...line[1].inset, ...color],
	line,
	/** The rings of the native range thumb, with the native range under forced colors. */
	thumb,
} as const
