/**
 * Popover archetype: the height fit of a floating panel. The `fitHeight`
 * option of the floating layer writes a max-height on the positioned wrapper
 * when the panel is taller than the space on its side of the trigger. The
 * wrapper is a column, so each `min-h-0` item between the wrapper and the
 * scroll region shrinks into that cap, and the scroll region scrolls.
 *
 * Layer: kiso · Archetype: popover · Concern: fit
 */

export const fit = {
	/** The positioned wrapper that gets the max-height. */
	wrapper: 'flex flex-col',
	/** An item between the wrapper and the scroll region. */
	column: 'flex min-h-0 flex-col',
	/** The scroll region. */
	scroll: 'min-h-0 overflow-y-auto overscroll-contain',
} as const
