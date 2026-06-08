/**
 * Sen focus — how an element signals keyboard focus. Five named shapes
 * cover the patterns the library uses:
 *
 *   - `ring`      outset CSS outline + transparent offset gap. Renders as one
 *                 crisp stroke along the radius (unlike two stacked ring
 *                 shadows, which leave an anti-aliased seam at the corners).
 *                 The offset gap exposes the surface behind, so the stroke
 *                 reads against the element's own fill even when the fill IS
 *                 the accent colour — a solid button, a selected day, an
 *                 arbitrary-colour swatch.
 *   - `inset`     inset ring, for controls whose fill is already the surface
 *                 (inputs, in-chrome controls) or whose box can't carry an
 *                 outset stroke (bordered, inline)
 *   - `outline`   2 px outline on a `:has(:focus-visible)` wrapper,
 *                 swapped to an inset border inside scrollable ancestors
 *                 that would otherwise clip it
 *   - `indicator` background-paint marker (option items mark `aria-current`
 *                 with the same colour as the focus ring)
 *   - `lifted`    z-shift + shadow for popover triggers, with a violet
 *                 ring that reads against the panel backdrop
 *
 * Layer: kiso · Concern: focus indicators
 */

export const focus = {
	ring: [
		// CSS outline, not a box-shadow ring: one crisp stroke along the radius.
		// `outline-offset` opens a transparent gap exposing the surface behind,
		// so the stroke reads against the element's fill even when the fill IS
		// the accent colour. The accent brightens one step in dark mode to hold
		// ≥3:1 against zinc-900. Mouse-focus outlines are suppressed globally
		// (:focus:not(:focus-visible)).
		'focus-visible:outline-2 focus-visible:outline-offset-2',
		'focus-visible:outline-blue-600 dark:focus-visible:outline-blue-500',
	],
	inset: [
		'outline-none',
		'focus-visible:ring-2 ring-inset focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500',
	],
	outline: [
		'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 dark:has-focus-visible:outline-blue-500',
		/** Swaps to an inset ring inside `[data-scroll-region]` ancestors where `overflow-y-auto` would clip the outset outline. */
		'[[data-scroll-region]_&]:has-focus-visible:outline-none [[data-scroll-region]_&]:has-focus-visible:border-2 [[data-scroll-region]_&]:has-focus-visible:border-blue-600 dark:[[data-scroll-region]_&]:has-focus-visible:border-blue-500',
	],
	indicator: 'not-data-current:focus-visible:after:bg-blue-600',
	lifted: ['z-10', 'shadow-md', 'focus-visible:ring-violet-600'],
} as const
