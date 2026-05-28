/**
 * Sen focus — how an element signals keyboard focus. Five named shapes
 * cover the patterns the library uses:
 *
 *   - `ring`      outset ring on the element
 *   - `inset`     inset ring (for in-chrome controls)
 *   - `outline`   2 px outline on a `:has(:focus-visible)` wrapper,
 *                 swapped to an inset border inside scrollable ancestors
 *                 that would otherwise clip it
 *   - `indicator` background-paint marker (option items mark `aria-current`
 *                 with the same colour as the focus ring)
 *   - `lifted`    z-shift + shadow for popover triggers, with a violet
 *                 ring so it reads against the panel backdrop
 *
 * Layer: kiso · Concern: focus indicators
 */

export const focus = {
	ring: 'outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
	inset: 'outline-none focus-visible:ring-2 ring-inset focus-visible:ring-blue-600',
	outline: [
		'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600',
		/** Outset outline on a `:has(:focus-visible)` wrapper; swaps to an inset ring inside `[data-scroll-region]` ancestors so `overflow-y-auto` parents can't clip it. */
		'[[data-scroll-region]_&]:has-focus-visible:outline-none [[data-scroll-region]_&]:has-focus-visible:border-2 [[data-scroll-region]_&]:has-focus-visible:border-blue-600',
	],
	indicator: 'not-data-current:focus-visible:after:bg-blue-600',
	lifted: 'z-10 shadow-md focus-visible:ring-violet-600',
} as const
