/**
 * Narabi fit: the height fit of a panel with a capped height. The wrapper is a
 * column, so each `min-h-0` item between the wrapper and the scroll region
 * shrinks into the cap, and the scroll region scrolls. For a floating panel,
 * the `fitHeight` option of the floating layer writes the cap on the
 * positioned wrapper when the panel is taller than the space on its side of
 * the trigger. A modal panel (`kumi/panel`) has a cap of its own.
 *
 * Layer: kiso · Concern: capped panel height
 */

import { flex } from './flex'

export const fit = {
	/** The positioned wrapper that gets the max-height. */
	wrapper: flex.col,
	/** An item between the wrapper and the scroll region. */
	column: [flex.col, 'min-h-0'],
	/** The scroll region. */
	scroll: 'min-h-0 overflow-y-auto overscroll-contain',
} as const
