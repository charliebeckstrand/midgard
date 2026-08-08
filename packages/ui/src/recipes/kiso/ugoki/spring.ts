/**
 * Ugoki spring: the spring vocabulary, keyed by character. Each entry is a
 * complete Framer `transition` value; a kata exposes the one its unit moves
 * on, so every spring in the system is named and tuned here.
 *
 * Layer: kiso · Concern: spring transitions
 */

export const spring = {
	/** Fluid `layoutId` glide — the segment / tab active-indicator slide. */
	slide: { type: 'spring', stiffness: 300, damping: 30 },
	/** Soft settle onto a value — the progress bar and gauge sweeping to their fill. */
	settle: { type: 'spring', stiffness: 100, damping: 20 },
	/** Stack reflow — neighbours re-packing after a toast dismissal. */
	reflow: { type: 'spring', stiffness: 500, damping: 25 },
	/** Snappy, lightly-damped glide — settles fast with a touch of give, not a bounce. */
	snap: { type: 'spring', stiffness: 600, damping: 38 },
} as const
